import { advanceOrderStatus } from "../orders/automatic-order-status.js";
import { Router } from "express";
import { trackingSimulationEnabled, setSimulatedTracking, getSimulatedTracking } from "../orders/tracking-simulation.js";
import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { calculateOrderPacking } from "./order-packing.service.js";

/** Only authenticated moderators can create carrier orders. Mounted after moderatorAuthMiddleware. */
const router = Router();
type Shipment = { id: string; order_id: string; operator_request_id: string; yandex_request_id: string | null; status: string; error_code: string | null; created_at: Date };
const fail = (res: any, code: string, message: string, status = 400) => res.status(status).json({error:{code,message}});
const asRecord = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : {};
const pick = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;

// Structured diagnostics for Yandex requests. Recipient PII and credentials are
// deliberately redacted; business payload fields remain available for comparison.
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "[REDACTED]";
}
function redactDiagnostic(value: unknown, key = ""): unknown {
  const normalized = key.toLowerCase();
  if (["phone", "phone_number", "recipient_phone"].includes(normalized)) {
    return typeof value === "string" ? maskPhone(value) : "[REDACTED]";
  }
  if (["email", "recipient_email"].includes(normalized)) return value ? "[REDACTED]" : value;
  if (["first_name", "last_name", "patronymic", "recipient_name", "full_name"].includes(normalized)) {
    return value ? "[REDACTED]" : value;
  }
  if (["address", "full_address", "address_string"].includes(normalized)) return value ? "[REDACTED]" : value;
  if (Array.isArray(value)) return value.map(item => redactDiagnostic(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([childKey, childValue]) => [childKey, redactDiagnostic(childValue, childKey)]));
  }
  return value;
}
function logYandexDiagnostic(event: string, details: Record<string, unknown>): void {
  // Keep one JSON object per line so logs can be filtered by event/order/attempt.
  console.info(event, JSON.stringify(redactDiagnostic(details)));
}
// Extract field paths and validation codes only. Never expose raw upstream text,
// which can contain recipient addresses, phones or other personal information.
function extractValidationFields(payload: Record<string, unknown>): string[] {
  const result: string[] = [];
  const safe = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const s = value.trim();
    return s.length <= 100 && /^[a-zA-Z0-9_.\[\]-]+$/.test(s) ? s : null;
  };
  const collect = (item: unknown) => {
    const record = asRecord(item);
    for (const key of ["field", "path", "loc", "code", "type"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        const path = value.map(safe);
        if (path.every(Boolean)) result.push(path.join("."));
      } else {
        const s = safe(value);
        if (s) result.push(s);
      }
    }
  };
  for (const key of ["details", "errors", "violations", "validation_errors"]) {
    const value = payload[key];
    if (Array.isArray(value)) value.slice(0, 20).forEach(collect);
    else if (value && typeof value === "object") {
      Object.keys(asRecord(value)).slice(0, 20).forEach(k => {
        const s = safe(k);
        if (s) result.push(s);
      });
    }
  }
  return [...new Set(result)].slice(0, 20);
}


/** Check an ambiguous creation by the merchant's stable order number. Never create in this method. */
async function lookupCarrierShipment(orderNumber: string): Promise<
  | { kind: "found"; requestId: string }
  | { kind: "not_found" }
  | { kind: "unavailable"; code: string }
> {
  const token = process.env.YANDEX_DELIVERY_TOKEN;
  if (!token) return { kind: "unavailable", code: "YANDEX_NOT_CONFIGURED" };
  try {
    const url = new URL("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/info");
    url.searchParams.set("request_code", orderNumber);
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": "ru" },
      signal: AbortSignal.timeout(15000),
    });
    let data: unknown;
    try { data = await response.json(); } catch { return { kind: "unavailable", code: "INVALID_LOOKUP_RESPONSE" }; }
    const payload = asRecord(data);
    if (response.status === 404 && payload.code === "customer_order_not_found") {
      return { kind: "not_found" };
    }
    if (!response.ok) return { kind: "unavailable", code: `LOOKUP_HTTP_${response.status}` };
    const requestId = pick(payload.request_id);
    const carrierOrder = pick(asRecord(asRecord(payload.request).info).operator_request_id);
    if (!requestId || (carrierOrder && carrierOrder !== orderNumber)) {
      return { kind: "unavailable", code: "LOOKUP_MISMATCH" };
    }
    return { kind: "found", requestId };
  } catch {
    return { kind: "unavailable", code: "LOOKUP_NETWORK_ERROR" };
  }
}

/** Reconcile only an existing uncertain row; a 404 does not authorize an automatic retry. */
async function reconcileUncertain(orderNumber: string): Promise<
  | { status: "submitted"; requestId: string }
  | { status: "uncertain"; result: "not_found" | "unavailable"; code?: string }
> {
  const result = await lookupCarrierShipment(orderNumber);
  if (result.kind === "found") {
    const updated = await prisma.$executeRaw`
      UPDATE yandex_shipments SET yandex_request_id=${result.requestId}, status='submitted',
      error_code=NULL, updated_at=now()
      WHERE operator_request_id=${orderNumber} AND status='uncertain' AND yandex_request_id IS NULL`;
    if (updated > 0) return { status: "submitted", requestId: result.requestId };
    const current = await prisma.$queryRaw<Array<{status:string;yandex_request_id:string|null}>>`
      SELECT status, yandex_request_id FROM yandex_shipments WHERE operator_request_id=${orderNumber} LIMIT 1`;
    if (current[0]?.status === 'submitted' && current[0].yandex_request_id) {
      return { status: 'submitted', requestId: current[0].yandex_request_id };
    }
    return { status: 'uncertain', result: 'unavailable', code: 'STATE_CHANGED' };
  }
  return { status: "uncertain", result: result.kind === "not_found" ? "not_found" : "unavailable",
    ...(result.kind === "unavailable" ? { code: result.code } : {}) };
}

/** Periodically recover uncertain requests, including those left by a previous process.
 * Reconciliation is read-only at the carrier: it never submits a second shipment.
 * A single in-process worker is guarded against overlapping runs.
 */
let reconciliationRunning = false;
async function reconcilePendingShipments(): Promise<void> {
  if (reconciliationRunning) return;
  reconciliationRunning = true;
  try {
    const pending = await prisma.$queryRaw<Array<{ operator_request_id: string }>>`
      SELECT operator_request_id FROM yandex_shipments
      WHERE status='uncertain' AND yandex_request_id IS NULL
      ORDER BY updated_at ASC LIMIT 20`;
    for (const shipment of pending) {
      try {
        const outcome = await reconcileUncertain(shipment.operator_request_id);
        if (outcome.status === 'submitted') {
          console.info('YANDEX_SHIPMENT_RECOVERED', { orderNumber: shipment.operator_request_id });
        }
      } catch (error) {
        console.error('YANDEX_RECONCILIATION_FAILED', {
          orderNumber: shipment.operator_request_id,
          error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        });
      }
    }
  } catch (error) {
    console.error('YANDEX_RECONCILIATION_SCAN_FAILED', error instanceof Error ? error.name : 'UNKNOWN_ERROR');
  } finally {
    reconciliationRunning = false;
  }
}

// The timer is unref'd so it does not keep a stopped backend process alive.
// Scan once shortly after boot and then every 60 seconds.
if (process.env.YANDEX_DELIVERY_TOKEN) {
  const startup = setTimeout(() => { void reconcilePendingShipments(); }, 5000);
  startup.unref();
  const interval = setInterval(() => { void reconcilePendingShipments(); }, 60000);
  interval.unref();
}

// Orders eligible for manual Yandex shipment creation, plus submitted shipments.
router.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<Array<{
      order_number: string; payment_status: string; order_status: string;
      recipient_name: string | null; full_address: string | null;
      delivery_service: string | null; shipment_status: string | null;
      yandex_request_id: string | null; error_code: string | null;
      created_at: Date;
    }>>`
      SELECT o.order_number, o.payment_status, o.status AS order_status,
             d.recipient_name, d.full_address, d.delivery_service,
             s.status AS shipment_status, s.yandex_request_id, s.error_code,
             o.ordered_at AS created_at
      FROM orders o
      JOIN order_deliveries d ON d.order_id = o.id
      LEFT JOIN yandex_shipments s ON s.order_id = o.id
      WHERE d.delivery_service ILIKE '%yandex%'
         OR d.delivery_service ILIKE '%яндекс%'
         OR d.full_address LIKE '[ПВЗ Яндекс %'
      ORDER BY o.ordered_at DESC LIMIT 200`;
    res.json({ data: rows });
  } catch (e) { next(e); }
});


// Labels are generated by the carrier; downloading never creates another shipment.
async function sendLabels(res: any, orderNumbers: string[], size: string, layout: string) {
  if (!orderNumbers.length || orderNumbers.length > 50 || orderNumbers.some(n => !/^TM-[A-Z0-9-]{4,60}$/i.test(n)))
    return fail(res, "INVALID_ORDERS", "Укажите от 1 до 50 корректных номеров заказов");
  const allowedSizes = ["210x297", "100x150", "75x120", "58x60", "58x40"];
  if (!allowedSizes.includes(size)) return fail(res, "INVALID_LABEL_SIZE", "Недопустимый размер этикетки");
  if (layout !== "one" && layout !== "many") return fail(res, "INVALID_LABEL_LAYOUT", "Недопустимая компоновка");
  const token = process.env.YANDEX_DELIVERY_TOKEN;
  if (!token) return fail(res, "YANDEX_NOT_CONFIGURED", "Не задан токен Яндекс Доставки", 503);
  const placeholders = orderNumbers.map((_, index) => `$${index + 1}`).join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<{order_number:string;yandex_request_id:string|null}>>(
    `SELECT o.order_number, s.yandex_request_id FROM orders o
     JOIN yandex_shipments s ON s.order_id = o.id
     WHERE o.order_number IN (${placeholders}) AND s.yandex_request_id IS NOT NULL`,
    ...orderNumbers,
  );
  const found = new Map(rows.map(r => [r.order_number, r.yandex_request_id]));
  if (orderNumbers.some(n => !found.has(n))) return fail(res, "SHIPMENT_NOT_REGISTERED", "Не все выбранные заказы имеют оформленные отправления", 409);
  const requestIds = [...new Set(orderNumbers.map(n => found.get(n)!))];
  let response: globalThis.Response;
  try {
    response = await fetch("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/generate-labels", {
      method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type":"application/json", Accept:"application/pdf"},
      body: JSON.stringify({request_ids: requestIds, generate_type: layout, label_size_mm:size, language:"ru"}),
      signal: AbortSignal.timeout(25000),
    });
  } catch { return fail(res, "YANDEX_LABEL_NETWORK", "Не удалось получить этикетки от Яндекса", 502); }
  if (!response.ok) return fail(res, "YANDEX_LABELS_UNAVAILABLE", `Яндекс не выдал этикетки (HTTP ${response.status})`, 502);
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 20000000) return fail(res,"LABEL_TOO_LARGE","Документ превышает допустимый размер",502);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 20000000 || bytes.subarray(0,5).toString("ascii") !== "%PDF-")
    return fail(res,"INVALID_LABEL_RESPONSE","Яндекс вернул некорректный PDF",502);
  // The carrier has successfully generated a valid PDF.
  // Advance each paid order only once; never regress its status.
  for (const row of rows) {
    try {
      const order = await prisma.orders.findUnique({
        where: { order_number: row.order_number },
        select: { id: true }
      });
      if (order) await advanceOrderStatus(order.id, "processing");
    } catch (error) {
      console.error("YANDEX_LABEL_ORDER_STATUS_ERROR", row.order_number, error);
    }
  }

  res.setHeader("Content-Type","application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="yandex-labels-${orderNumbers.length}.pdf"`);
  res.setHeader("Cache-Control","no-store");
  return res.send(bytes);
}
router.get("/:orderNumber/labels", async (req,res,next) => {
  try { await sendLabels(res,[String(req.params.orderNumber)],String(req.query.size ?? "58x40"),String(req.query.layout ?? "one")); }
  catch(e){next(e);}
});
router.post("/labels/batch", async(req,res,next) => {
  try {
    const body = asRecord(req.body);
    const orders = body.orderNumbers;
    if (!Array.isArray(orders) || orders.some(v=>typeof v!=="string")) return fail(res,"INVALID_ORDERS","Неверный список заказов");
    await sendLabels(res,[...new Set(orders as string[])],String(body.size ?? "58x40"),String(body.layout ?? "many"));
  } catch(e){next(e);}
});

router.get("/:orderNumber", async (req, res, next) => {
  try {
    const orderNumber = String(req.params.orderNumber);
    const rows = await prisma.$queryRaw<Shipment[]>`SELECT s.* FROM yandex_shipments s JOIN orders o ON o.id=s.order_id WHERE o.order_number=${orderNumber} ORDER BY s.created_at DESC LIMIT 1`;
    res.json({data:rows[0] ?? null});
  } catch (e) { next(e); }
});

// Read-only carrier reconciliation; no shipment is created or retried here.
router.post("/:orderNumber/reconcile", async (req, res, next) => {
  try {
    const orderNumber = String(req.params.orderNumber);
    if (!/^TM-[A-Z0-9-]{4,60}$/i.test(orderNumber)) return fail(res, "INVALID_ORDER", "Некорректный номер заказа");
    const rows = await prisma.$queryRaw<Shipment[]>`
      SELECT s.* FROM yandex_shipments s JOIN orders o ON o.id=s.order_id
      WHERE o.order_number=${orderNumber} LIMIT 1`;
    if (!rows.length) return fail(res, "SHIPMENT_NOT_FOUND", "Отправление не найдено", 404);
    if (rows[0]!.status !== "uncertain") return fail(res, "NOT_UNCERTAIN", "Заявка не требует сверки", 409);
    res.json({ data: await reconcileUncertain(orderNumber) });
  } catch (error) { next(error); }
});

export async function submitYandexShipment(orderNumber: string, res: any): Promise<void> {
  try {
    if (!/^TM-[A-Z0-9-]{4,60}$/i.test(orderNumber)) return fail(res,"INVALID_ORDER","Некорректный номер заказа");
    const order = await prisma.orders.findUnique({where:{order_number:orderNumber},include:{order_items:true,order_deliveries:true}});
    if (!order) return fail(res,"ORDER_NOT_FOUND","Заказ не найден",404);
    if (order.payment_status !== "paid") return fail(res,"NOT_PAID","Сначала необходимо подтвердить оплату заказа",409);
    if (order.status === "cancelled") return fail(res,"ORDER_CANCELLED","Нельзя отправить отменённый заказ",409);
    const delivery = order.order_deliveries;
    if (!delivery || !(/яндекс|yandex/i.test(delivery.delivery_service ?? "") || /^\[ПВЗ Яндекс [a-zA-Z0-9-]{20,80}\]/.test(delivery.full_address ?? ""))) return fail(res,"NOT_YANDEX","Заказ не относится к Яндекс Доставке",409);
    const stationMatch = delivery.full_address.match(/\[\u041F\u0412\u0417\s+\u042F\u043D\u0434\u0435\u043A\u0441\s+([a-zA-Z0-9-]{20,80})\]/);
    const doorFullAddress = !stationMatch ? (delivery.full_address ?? "").trim() : "";
    if (!stationMatch && (doorFullAddress.length < 12 || doorFullAddress.length > 300 || doorFullAddress.split(",").length < 3))
      return fail(res,"DESTINATION_MISSING","Для курьерской доставки нужен полный адрес: город, улица, дом",409);
    const settings = await prisma.$queryRaw<Array<{primary_dropoff_id:string|null}>>`SELECT primary_dropoff_id FROM yandex_delivery_settings WHERE id=1`;
    const dropoffId = settings[0]?.primary_dropoff_id;
    if (!dropoffId) return fail(res,"SOURCE_MISSING","Выберите основной ПВЗ отгрузки",409);
    // Registered sender station and preferred physical drop-off point are different entities.
    const source = process.env.YANDEX_DELIVERY_SOURCE_STATION_ID?.trim();
    if (!source) return fail(res,"SOURCE_MISSING","Укажите станцию отправителя Яндекс Доставки",409);
    const plan = await calculateOrderPacking(orderNumber);
    if (plan.status !== "calculated" || !plan.parcels.length) return fail(res,"PACKING_UNAVAILABLE","Не удалось подобрать коробку; проверьте размеры и вес товаров",409);
    const token = process.env.YANDEX_DELIVERY_TOKEN;
    if (!token) return fail(res,"YANDEX_NOT_CONFIGURED","Боевой токен Яндекс Доставки не задан",503);
    // Atomic DB reservation: concurrent clicks cannot send duplicate requests.
    // A confirmed 4xx rejection cannot have created a remote shipment.
    // Reuse the same operator_request_id and atomically claim the rejected row.
    const inserted = await prisma.$queryRaw<Shipment[]>`
      INSERT INTO yandex_shipments (order_id,operator_request_id,status)
      VALUES (${order.id}::uuid,${order.order_number},'creating')
      ON CONFLICT (order_id) DO UPDATE SET
        status='creating', error_code=NULL, updated_at=now()
      WHERE yandex_shipments.status='rejected' AND yandex_shipments.yandex_request_id IS NULL
      RETURNING *`;
    if (!inserted.length) {
      const existing = await prisma.$queryRaw<Shipment[]>`SELECT * FROM yandex_shipments WHERE order_id=${order.id}::uuid LIMIT 1`;
      return fail(res,"ALREADY_SUBMITTED",existing[0]?.status === "uncertain" ? "Ответ Яндекса неизвестен. Перед повторной попыткой проверьте заявку в Яндексе." : "Заявка по этому заказу уже создаётся или создана",409);
    }
    if (!delivery.recipient_name?.trim() || !delivery.phone?.trim()) {
      await prisma.$executeRaw`UPDATE yandex_shipments SET status='rejected',error_code='RECIPIENT_MISSING',updated_at=now() WHERE order_id=${order.id}::uuid`;
      return fail(res,"RECIPIENT_MISSING","Не заполнены имя или телефон получателя",409);
    }
    const recipient = delivery.recipient_name.trim().split(/\s+/);
    const physicalDims = plan.parcels.map(p => ({
      dx: Math.ceil(Number(p.dimensions_cm[0])),
      dy: Math.ceil(Number(p.dimensions_cm[1])),
      dz: Math.ceil(Number(p.dimensions_cm[2])),
      weight_gross: Math.ceil(Number(p.weight_g)),
    }));
    if (physicalDims.some(d => Object.values(d).some(v => !Number.isFinite(v) || v <= 0))) {
      await prisma.$executeRaw`UPDATE yandex_shipments SET status='rejected',error_code='INVALID_PACKING',updated_at=now() WHERE order_id=${order.id}::uuid`;
      return fail(res,"INVALID_PACKING","Некорректные габариты или вес упаковки",409);
    }
    // Bind each product line to the actual parcel(s) selected by the packing engine.
    const parcelBarcodes = plan.parcels.map((_, index) => `${order.order_number}-${index + 1}`.slice(0, 60));
    const quantitiesBySku = new Map<string, number>();
    for (const item of order.order_items) quantitiesBySku.set(item.sku, (quantitiesBySku.get(item.sku) ?? 0) + item.quantity);
    const carrierItems: Array<{count:number;name:string;article:string;place_barcode:string;billing_details:{unit_price:number;assessed_unit_price:number}}> = [];
    for (let parcelIndex = 0; parcelIndex < plan.parcels.length; parcelIndex++) {
      const counts = new Map<string, number>();
      for (const placement of plan.parcels[parcelIndex]!.placements) counts.set(placement.sku, (counts.get(placement.sku) ?? 0) + 1);
      for (const [sku, count] of counts) {
        const line = order.order_items.find(i => i.sku === sku);
        if (!line) return fail(res,"PACKING_MISMATCH","Товар в упаковке не совпадает с заказом",409);
        const unitKopecks = Math.round(Number(line.unit_price) * 100);
        if (!Number.isSafeInteger(unitKopecks) || unitKopecks < 0) return fail(res,"INVALID_ITEM_PRICE","Некорректная цена товара",409);
        carrierItems.push({count,name:line.product_name,article:sku,place_barcode:parcelBarcodes[parcelIndex]!,billing_details:{unit_price:unitKopecks,assessed_unit_price:unitKopecks}});
        quantitiesBySku.set(sku, (quantitiesBySku.get(sku) ?? 0) - count);
      }
    }
    if ([...quantitiesBySku.values()].some(q => q !== 0)) return fail(res,"PACKING_MISMATCH","Количество товаров в коробках не совпадает с заказом",409);
    const body = {
      info:{operator_request_id:order.order_number},
      source:{platform_station:{platform_id:source}},
      destination:stationMatch ? {type:"platform_station",platform_station:{platform_id:stationMatch[1]}} : {type:"custom_location",custom_location:{details:{full_address:doorFullAddress}}},
      items:carrierItems,
      places:physicalDims.map((physical_dims,index)=>({barcode:parcelBarcodes[index]!,physical_dims})),
      billing_info:{payment_method:"already_paid",delivery_cost:0},
      recipient_info:{first_name:recipient[1] ?? recipient[0] ?? "Получатель",last_name:recipient.length>1 ? recipient[0] : "Получатель",phone:delivery.phone,email:order.email ?? undefined},
      last_mile_policy:stationMatch ? "self_pickup" : "time_interval",particular_items_refuse:false,forbid_unboxing:false,
    };
    const attemptId = randomUUID();
    const requestUrl = "https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/create";
    const requestBody = JSON.stringify(body);
    const requestStartedAt = Date.now();
    logYandexDiagnostic("YANDEX_CREATE_REQUEST", {
      attemptId,
      orderNumber,
      method: "POST",
      url: requestUrl,
      headers: { "Content-Type": "application/json", "Accept-Language": "ru", authorization: "[REDACTED]" },
      timeoutMs: 25000,
      requestBody: body,
    });
    let response: globalThis.Response;
    try {
      response = await fetch(requestUrl,{
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Accept-Language":"ru"},
        body:requestBody,signal:AbortSignal.timeout(25000),
      });
    } catch (error) {
      logYandexDiagnostic("YANDEX_CREATE_NETWORK_ERROR", {
        attemptId, orderNumber, durationMs: Date.now() - requestStartedAt,
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorCode: typeof error === "object" && error !== null && "code" in error ? String((error as {code: unknown}).code) : null,
      });
      await prisma.$executeRaw`UPDATE yandex_shipments SET status='uncertain',error_code='NETWORK_UNCERTAIN',updated_at=now() WHERE order_id=${order.id}::uuid`;
      const checked = await reconcileUncertain(orderNumber);
      if (checked.status === "submitted") return res.status(201).json({ data: { orderNumber,
        yandexRequestId: checked.requestId, status: "submitted", places: plan.parcels.length, recovered: true } });
      return fail(res,"NETWORK_UNCERTAIN","Связь с Яндексом прервалась. Не повторяйте создание, пока не проверите наличие заявки.",502);
    }
    const rawResponse = await response.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(rawResponse); } catch { /* Non-JSON upstream response */ }
    const payload = asRecord(parsed);
    logYandexDiagnostic("YANDEX_CREATE_RESPONSE", {
      attemptId,
      orderNumber,
      httpStatus: response.status,
      ok: response.ok,
      durationMs: Date.now() - requestStartedAt,
      responseHeaders: {
        contentType: response.headers.get("content-type"),
        requestId: response.headers.get("x-request-id") ?? response.headers.get("x-yandex-request-id"),
      },
      // Preserve the complete structured response when JSON; redact recipient PII.
      responseBody: parsed !== null ? parsed : { nonJsonResponse: true, bodyLength: rawResponse.length },
    });
    if (!response.ok) {
      const code = String(payload.code ?? `HTTP_${response.status}`);
      // Never automatically retry 5xx: the carrier may have accepted the request.
      const uncertain = response.status >= 500 || response.status === 408 || response.status === 429;
      await prisma.$executeRaw`UPDATE yandex_shipments SET status=${uncertain?'uncertain':'rejected'},error_code=${code.slice(0,100)},updated_at=now() WHERE order_id=${order.id}::uuid`;
      if (uncertain) {
        const checked = await reconcileUncertain(orderNumber);
        if (checked.status === "submitted") {
          return res.status(201).json({ data: { orderNumber, yandexRequestId: checked.requestId,
            status: "submitted", places: plan.parcels.length, recovered: true } });
        }
        console.warn("YANDEX_CREATE_UNCERTAIN", { attemptId, orderNumber, upstreamStatus: response.status,
          upstreamCode: code.slice(0, 100), lookup: checked.result });
      }
      // Return only validation diagnostics, never the full carrier response (PII may be present).
      const diagnostics = {
        upstreamStatus: response.status,
        upstreamCode: code.slice(0,100),
        fields: extractValidationFields(payload),
        // Only expose a constrained diagnostic phrase, never addresses or phone numbers.
        upstreamMessage: (() => {
          const message = pick(payload.message) ?? pick(payload.description);
          return message && message.length <= 160 && /^[a-zA-Z0-9 _.,:;()\-]+$/.test(message) ? message : null;
        })(),
      };
      return res.status(502).json({
        error: {
          code: uncertain ? "YANDEX_UNCERTAIN" : "YANDEX_REJECTED",
          message: uncertain ? "Ответ Яндекса неопределён; проверьте заявку перед повтором" : "Яндекс отклонил оформление заявки",
          diagnostics,
        },
      });
    }
    const requestId = pick(payload.request_id) ?? pick(payload.id);
    if (!requestId) {
      await prisma.$executeRaw`UPDATE yandex_shipments SET status='uncertain',error_code='INVALID_RESPONSE',updated_at=now() WHERE order_id=${order.id}::uuid`;
      const checked = await reconcileUncertain(orderNumber);
      if (checked.status === "submitted") return res.status(201).json({ data: { orderNumber,
        yandexRequestId: checked.requestId, status: "submitted", places: plan.parcels.length, recovered: true } });
      return fail(res,"INVALID_RESPONSE","Яндекс не вернул идентификатор заявки; требуется проверка",502);
    }
    await prisma.$executeRaw`UPDATE yandex_shipments SET yandex_request_id=${requestId},status='submitted',updated_at=now() WHERE order_id=${order.id}::uuid`;
    res.status(201).json({data:{orderNumber,yandexRequestId:requestId,status:"submitted",places:plan.parcels.length}});
  } catch (e) { throw e; }
}

router.post("/:orderNumber/create", async (req, res, next) => {
  try { await submitYandexShipment(String(req.params.orderNumber), res); }
  catch (e) { next(e); }
});

// Shared safe path for webhook-triggered creation. No fake network retries on uncertainty.
export async function createYandexShipmentAfterPayment(orderNumber: string): Promise<void> {
  let status = 200;
  const response = {
    status(code: number) { status = code; return this; },
    json(payload: unknown) {
      if (status >= 400) {
        const error = (payload as {error?:{code?:string}})?.error;
        console.error("YANDEX_AUTO_SHIPMENT_FAILED", orderNumber, error?.code ?? status);
      }
      return this;
    }
  };
  await submitYandexShipment(orderNumber, response);
}
// This router is already protected by moderator authentication at mount point.
// Never allow simulation in production or without explicit local opt-in.
router.get("/:orderNumber/tracking-simulation", async (req, res, next) => {
  if (!trackingSimulationEnabled()) { res.status(404).json({error:{message:"Недоступно"}}); return; }
  try {
    const orderNumber=String(req.params.orderNumber);
    const order=await prisma.orders.findUnique({where:{order_number:orderNumber},select:{id:true}});
    if (!order) { res.status(404).json({error:{message:"Заказ не найден"}}); return; }
    res.json({data:getSimulatedTracking(orderNumber)});
  } catch(e) { next(e); }
});
router.post("/:orderNumber/tracking-simulation", async (req, res, next) => {
  if (!trackingSimulationEnabled()) { res.status(404).json({error:{message:"Недоступно"}}); return; }
  try {
    const orderNumber=String(req.params.orderNumber);
    const stage=req.body?.stage;
    if (typeof stage !== "number" || !Number.isInteger(stage) || stage < -1 || stage > 5) {
      res.status(400).json({error:{message:"Некорректный этап"}}); return;
    }
    const order=await prisma.orders.findUnique({where:{order_number:orderNumber},select:{id:true}});
    if (!order) { res.status(404).json({error:{message:"Заказ не найден"}}); return; }
    res.json({data:setSimulatedTracking(orderNumber,stage)});
  } catch(e) { next(e); }
});
export default router;