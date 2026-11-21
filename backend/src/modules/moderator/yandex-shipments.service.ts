import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { calculateOrderPacking } from "./order-packing.service.js";

/**
 * Создание и сверка заявок в Яндекс Доставке.
 * Вынесено из маршрутов, чтобы сервис оплаты мог создавать отправление
 * без зависимости от Express-роутера.
 */

export type Shipment = { id: string; order_id: string; operator_request_id: string; yandex_request_id: string | null; status: string; error_code: string | null; created_at: Date };

/** Результат операции в виде HTTP-статуса и тела ответа. */
export type ShipmentResult = { status: number; body: unknown };

const failure = (code: string, message: string, status = 400): ShipmentResult =>
  ({ status, body: { error: { code, message } } });

export const asRecord = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : {};
export const pick = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;

/** Фиксирует отказ по данным заказа, не затирая уже созданную или создаваемую заявку. */
async function recordRejection(orderId: string, orderNumber: string, code: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO yandex_shipments (order_id,operator_request_id,status,error_code)
    VALUES (${orderId}::uuid,${orderNumber},'rejected',${code})
    ON CONFLICT (order_id) DO UPDATE SET error_code=EXCLUDED.error_code, updated_at=now()
    WHERE yandex_shipments.status='rejected'`;
}

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
export async function reconcileUncertain(orderNumber: string): Promise<
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

/** Запускает фоновую сверку «неопределённых» заявок. Вызывается один раз из server.ts.
 * Таймеры unref'd, чтобы не удерживать остановленный процесс.
 * Первая проверка — через 5 секунд после старта, затем раз в минуту.
 */
export function startYandexShipmentReconciliation(): void {
  if (!process.env.YANDEX_DELIVERY_TOKEN) return;
  const startup = setTimeout(() => { void reconcilePendingShipments(); }, 5000);
  startup.unref();
  const interval = setInterval(() => { void reconcilePendingShipments(); }, 60000);
  interval.unref();
}

export async function submitYandexShipment(orderNumber: string): Promise<ShipmentResult> {
  if (!/^TM-[A-Z0-9-]{4,60}$/i.test(orderNumber)) return failure("INVALID_ORDER","Некорректный номер заказа");
  const order = await prisma.orders.findUnique({where:{order_number:orderNumber},include:{order_items:true,order_deliveries:true}});
  if (!order) return failure("ORDER_NOT_FOUND","Заказ не найден",404);
  if (order.payment_status !== "paid") return failure("NOT_PAID","Сначала необходимо подтвердить оплату заказа",409);
  if (order.status === "cancelled") return failure("ORDER_CANCELLED","Нельзя отправить отменённый заказ",409);
  const delivery = order.order_deliveries;
  if (!delivery || !(/яндекс|yandex/i.test(delivery.delivery_service ?? "") || /^\[ПВЗ Яндекс [a-zA-Z0-9-]{20,80}\]/.test(delivery.full_address ?? ""))) return failure("NOT_YANDEX","Заказ не относится к Яндекс Доставке",409);
  const stationMatch = delivery.full_address.match(/\[\u041F\u0412\u0417\s+\u042F\u043D\u0434\u0435\u043A\u0441\s+([a-zA-Z0-9-]{20,80})\]/);
  const doorFullAddress = !stationMatch ? (delivery.full_address ?? "").trim() : "";
  if (!stationMatch && (doorFullAddress.length < 12 || doorFullAddress.length > 300 || doorFullAddress.split(",").length < 3))
    return failure("DESTINATION_MISSING","Для курьерской доставки нужен полный адрес: город, улица, дом",409);
  const settings = await prisma.$queryRaw<Array<{primary_dropoff_id:string|null}>>`SELECT primary_dropoff_id FROM yandex_delivery_settings WHERE id=1`;
  const dropoffId = settings[0]?.primary_dropoff_id;
  if (!dropoffId) return failure("SOURCE_MISSING","Выберите основной ПВЗ отгрузки",409);
  // Registered sender station and preferred physical drop-off point are different entities.
  // For PVZ orders, the configured live drop-off point is the sender station.
  // Door delivery keeps requiring an explicitly registered source station.
  const source = process.env.YANDEX_DELIVERY_SOURCE_STATION_ID?.trim() || (stationMatch ? dropoffId : null);
  if (!source) return failure("SOURCE_STATION_MISSING","Для доставки до двери не задана станция отправителя Яндекс Доставки",409);
  const plan = await calculateOrderPacking(orderNumber);
  if (plan.status !== "calculated" || !plan.parcels.length) return failure("PACKING_UNAVAILABLE","Не удалось подобрать коробку; проверьте размеры и вес товаров",409);
  const token = process.env.YANDEX_DELIVERY_TOKEN;
  if (!token) return failure("YANDEX_NOT_CONFIGURED","Боевой токен Яндекс Доставки не задан",503);
  // Все проверки данных — до резервирования строки: иначе ранний выход
  // оставлял заявку в статусе 'creating', и повторить отправку было нельзя.
  if (!delivery.recipient_name?.trim() || !delivery.phone?.trim()) {
    await recordRejection(order.id, order.order_number, "RECIPIENT_MISSING");
    return failure("RECIPIENT_MISSING","Не заполнены имя или телефон получателя",409);
  }
  const recipient = delivery.recipient_name.trim().split(/\s+/);
  const physicalDims = plan.parcels.map(p => ({
    dx: Math.ceil(Number(p.dimensions_cm[0])),
    dy: Math.ceil(Number(p.dimensions_cm[1])),
    dz: Math.ceil(Number(p.dimensions_cm[2])),
    weight_gross: Math.ceil(Number(p.weight_g)),
  }));
  if (physicalDims.some(d => Object.values(d).some(v => !Number.isFinite(v) || v <= 0))) {
    await recordRejection(order.id, order.order_number, "INVALID_PACKING");
    return failure("INVALID_PACKING","Некорректные габариты или вес упаковки",409);
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
      if (!line) {
        await recordRejection(order.id, order.order_number, "PACKING_MISMATCH");
        return failure("PACKING_MISMATCH","Товар в упаковке не совпадает с заказом",409);
      }
      const unitKopecks = Math.round(Number(line.unit_price) * 100);
      if (!Number.isSafeInteger(unitKopecks) || unitKopecks < 0) {
        await recordRejection(order.id, order.order_number, "INVALID_ITEM_PRICE");
        return failure("INVALID_ITEM_PRICE","Некорректная цена товара",409);
      }
      carrierItems.push({count,name:line.product_name,article:sku,place_barcode:parcelBarcodes[parcelIndex]!,billing_details:{unit_price:unitKopecks,assessed_unit_price:unitKopecks}});
      quantitiesBySku.set(sku, (quantitiesBySku.get(sku) ?? 0) - count);
    }
  }
  if ([...quantitiesBySku.values()].some(q => q !== 0)) {
    await recordRejection(order.id, order.order_number, "PACKING_MISMATCH");
    return failure("PACKING_MISMATCH","Количество товаров в коробках не совпадает с заказом",409);
  }
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
    return failure("ALREADY_SUBMITTED",existing[0]?.status === "uncertain" ? "Ответ Яндекса неизвестен. Перед повторной попыткой проверьте заявку в Яндексе." : "Заявка по этому заказу уже создаётся или создана",409);
  }
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
    if (checked.status === "submitted") return { status: 201, body: { data: { orderNumber,
      yandexRequestId: checked.requestId, status: "submitted", places: plan.parcels.length, recovered: true } } };
    return failure("NETWORK_UNCERTAIN","Связь с Яндексом прервалась. Не повторяйте создание, пока не проверите наличие заявки.",502);
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
        return { status: 201, body: { data: { orderNumber, yandexRequestId: checked.requestId,
          status: "submitted", places: plan.parcels.length, recovered: true } } };
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
    return { status: 502, body: {
      error: {
        code: uncertain ? "YANDEX_UNCERTAIN" : "YANDEX_REJECTED",
        message: uncertain ? "Ответ Яндекса неопределён; проверьте заявку перед повтором" : "Яндекс отклонил оформление заявки",
        diagnostics,
      },
    } };
  }
  const requestId = pick(payload.request_id) ?? pick(payload.id);
  if (!requestId) {
    await prisma.$executeRaw`UPDATE yandex_shipments SET status='uncertain',error_code='INVALID_RESPONSE',updated_at=now() WHERE order_id=${order.id}::uuid`;
    const checked = await reconcileUncertain(orderNumber);
    if (checked.status === "submitted") return { status: 201, body: { data: { orderNumber,
      yandexRequestId: checked.requestId, status: "submitted", places: plan.parcels.length, recovered: true } } };
    return failure("INVALID_RESPONSE","Яндекс не вернул идентификатор заявки; требуется проверка",502);
  }
  await prisma.$executeRaw`UPDATE yandex_shipments SET yandex_request_id=${requestId},status='submitted',updated_at=now() WHERE order_id=${order.id}::uuid`;
  return { status: 201, body: { data: { orderNumber, yandexRequestId: requestId, status: "submitted", places: plan.parcels.length } } };
}

/** Создание отправления после подтверждённой оплаты. Без повторов при неопределённом ответе. */
export async function createYandexShipmentAfterPayment(orderNumber: string): Promise<void> {
  const result = await submitYandexShipment(orderNumber);
  if (result.status >= 400) {
    const error = (result.body as { error?: { code?: string } })?.error;
    console.error("YANDEX_AUTO_SHIPMENT_FAILED", orderNumber, error?.code ?? result.status);
  }
}
