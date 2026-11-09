import { Router } from "express";
import { calculateOrderPacking } from "./order-packing.service.js";
import { prisma } from "../../database/prisma.js";

/** Sandbox-only diagnostics. No offer confirmation or shipment creation. */
const router = Router();
const HOST = "https://b2b.taxi.tst.yandex.net";
const LIVE_HOST = "https://b2b-authproxy.taxi.yandex.net";
const TOKEN = process.env.YANDEX_DELIVERY_TEST_TOKEN || "";
const STATION = process.env.YANDEX_DELIVERY_TEST_STATION_ID || "fbed3aa1-2cc6-4370-ab4d-59c5cc9bb924";
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "Accept-Language": "ru" };
const liveToken = () => process.env.YANDEX_DELIVERY_TOKEN?.trim();

type JsonRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is JsonRecord => typeof v === "object" && v !== null && !Array.isArray(v);
const stringField = (v: unknown, max = 250) => typeof v === "string" && v.length > 0 && v.length <= max ? v : null;
const failure = (res: any, code: string, message: string, status = 400) => res.status(status).json({ error: { code, message } });

async function request(path: string, body: JsonRecord, live = false) {
  const token = live ? liveToken() : TOKEN;
  if (!token) throw new Error(live ? "Боевой токен Яндекс Доставки не настроен" : "Тестовый токен Яндекс Доставки не настроен");
  const response = await fetch(`${live ? LIVE_HOST : HOST}${path}`, {
    method: "POST", headers: { ...headers, Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let data: unknown;
  try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 400) }; }
  return { status: response.status, ok: response.ok, data };
}
const upstreamError = (res: any, result: Awaited<ReturnType<typeof request>>) => {
  const details = isRecord(result.data) ? result.data : {};
  return res.status(200).json({ data: { ok: false, upstreamStatus: result.status,
    code: typeof details.code === "string" ? details.code : null,
    message: typeof details.message === "string" ? details.message : "Яндекс отклонил запрос",
  } });
};
const caught = (res: any, error: unknown) => {
  console.error("[Yandex Delivery API]", error);
  const cause = error instanceof Error
    ? (error as Error & { cause?: unknown }).cause
    : undefined;
  const details = cause instanceof Error
    ? `${cause.name}: ${cause.message}`
    : undefined;
  return res.status(200).json({ data: {
    ok: false,
    upstreamStatus: null,
    message: error instanceof Error ? error.message : "Ошибка связи с Яндексом",
    details,
  } });
};

// Store the sender's preferred drop-off station in PostgreSQL.
router.get("/primary-dropoff", async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{id:string;name:string;address:string;city:string}>>`
      SELECT primary_dropoff_id AS id, primary_dropoff_name AS name,
             primary_dropoff_address AS address, primary_dropoff_city AS city
      FROM yandex_delivery_settings WHERE id = 1`;
    res.json({ data: rows[0] ?? null });
  } catch (error) { console.error("[Yandex primary dropoff GET]", error); failure(res, "SETTINGS_ERROR", "Не удалось загрузить основной ПВЗ", 500); }
});
router.put("/primary-dropoff", async (req, res) => {
  const body = isRecord(req.body) ? req.body : {};
  const id = stringField(body.id, 128);
  const name = stringField(body.name, 250);
  const address = stringField(body.address, 500);
  const city = typeof body.city === "string" ? body.city.slice(0, 150) : "";
  if (!id || !name || !address) return failure(res, "INVALID_POINT", "Выберите корректный ПВЗ");
  try {
    // Validate sender drop-off point against the production pickup-point list.
    const result = await request("/api/b2b/platform/pickup-points/list", { type: "pickup_point", payment_method: "already_paid", available_for_dropoff: true }, true);
    if (!result.ok) return upstreamError(res, result);
    const rows = isRecord(result.data) && Array.isArray(result.data.points) ? result.data.points : [];
    const point = rows.filter(isRecord).find(p => p.id === id && p.available_for_dropoff === true);
    if (!point) return failure(res, "NOT_DROPOFF", "ПВЗ недоступен для самостоятельной отгрузки");
    const verifiedAddress = isRecord(point.address) ? point.address : {};
    const verifiedName = typeof point.name === "string" ? point.name : name;
    const verifiedFullAddress = typeof verifiedAddress.full_address === "string" ? verifiedAddress.full_address : address;
    const verifiedCity = typeof verifiedAddress.locality === "string" ? verifiedAddress.locality : city;
    await prisma.$executeRaw`
      INSERT INTO yandex_delivery_settings (id, primary_dropoff_id, primary_dropoff_name, primary_dropoff_address, primary_dropoff_city, updated_at)
      VALUES (1, ${id}, ${verifiedName}, ${verifiedFullAddress}, ${verifiedCity}, now())
      ON CONFLICT (id) DO UPDATE SET primary_dropoff_id = EXCLUDED.primary_dropoff_id,
        primary_dropoff_name = EXCLUDED.primary_dropoff_name, primary_dropoff_address = EXCLUDED.primary_dropoff_address,
        primary_dropoff_city = EXCLUDED.primary_dropoff_city, updated_at = now()`;
    res.json({ data: { id, name: verifiedName, address: verifiedFullAddress, city: verifiedCity } });
  } catch (error) { console.error("[Yandex primary dropoff PUT]", error); failure(res, "SETTINGS_ERROR", "Не удалось сохранить основной ПВЗ", 500); }
});
router.delete("/primary-dropoff", async (_req, res) => {
  try { await prisma.$executeRaw`DELETE FROM yandex_delivery_settings WHERE id = 1`; res.json({ data: null }); }
  catch (error) { console.error("[Yandex primary dropoff DELETE]", error); failure(res, "SETTINGS_ERROR", "Не удалось сбросить основной ПВЗ", 500); }
});

router.get("/config", (_req, res) => res.json({ data: { mode: "live", host: LIVE_HOST, stationId: STATION, realShipmentsEnabled: true, geography: "Россия" } }));

router.post("/check", async (_req, res) => {
  const url = new URL("/api/b2b/platform/offers/info", HOST);
  url.searchParams.set("station_id", STATION);
  url.searchParams.set("full_address", "Москва, Ленинградский проспект, 37к9");
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    const raw = await response.text();
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { payload = raw.slice(0, 400); }
    const code = isRecord(payload) && typeof payload.code === "string" ? payload.code : null;
    const noOptions = response.status === 400 && code === "no_delivery_options";
    const connected = response.ok || noOptions;
    res.json({ data: { mode: "test", connected, offersAvailable: response.ok,
      upstreamStatus: response.status, code,
      message: response.ok ? "Тестовый API ответил успешно" : noOptions
        ? "Тестовый API доступен. Для заданной станции и адреса нет вариантов доставки; расчёт тарифа не подтверждён"
        : response.status === 401 || response.status === 403 ? "Яндекс отклонил авторизацию" : "Яндекс вернул ошибку",
    } });
  } catch (error) { caught(res, error); }
});

// The official endpoint supports an empty request, but requesting all stations is expensive.
// Restrict this diagnostic to drop-off or recipient points and return a bounded page.
router.get("/points", async (req, res) => {
  const kind = req.query.kind === "destination" ? "destination" : req.query.kind === "dropoff" ? "dropoff" : null;
  if (!kind) return failure(res, "INVALID_KIND", "Укажите kind=dropoff или kind=destination");
  const query = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase().slice(0, 100) : "";
  try {
    const body: JsonRecord = { type: "pickup_point", payment_method: "already_paid" };
    if (kind === "dropoff") body.available_for_dropoff = true;
    const result = await request("/api/b2b/platform/pickup-points/list", body, true);
    if (!result.ok) return upstreamError(res, result);
    const rows = isRecord(result.data) && Array.isArray(result.data.points) ? result.data.points : [];
    const points = rows.filter(isRecord).filter(p => kind !== "dropoff" || p.available_for_dropoff === true).map(p => {
      const address = isRecord(p.address) ? p.address : {};
      return { id: p.id, name: p.name, operator: p.operator_id, availableForDropoff: p.available_for_dropoff === true,
        address: address.full_address || [address.locality, address.street, address.house].filter(Boolean).join(", "),
        city: address.locality || "", latitude: isRecord(p.position) ? p.position.latitude : null,
        longitude: isRecord(p.position) ? p.position.longitude : null };
    }).filter(p => typeof p.id === "string");
    const filtered = query ? points.filter(p => `${p.name} ${p.address}`.toLowerCase().includes(query)) : points;
    res.json({ data: { ok: true, kind, total: filtered.length, points: filtered, truncated: false,
      note: "Полный список доступных пунктов Яндекс Доставки." } });
  } catch (error) { caught(res, error); }
});

router.post("/quote", async (req, res) => {
  res.setHeader("X-Tea-Delivery-Quote-Version", "availability-aware-v8");
  const body = isRecord(req.body) ? req.body : {};
  const orderNumber = stringField(body.orderNumber, 80);
  const tariff = body.tariff === "self_pickup" || body.tariff === "time_interval" ? body.tariff : null;
  const destination = stringField(body.destination, 250);
  if (!orderNumber || !tariff || !destination) return failure(res, "INVALID_INPUT", "Укажите номер заказа, тип доставки и адрес или ID ПВЗ");
  if (tariff === "time_interval" && !destination.toLowerCase().includes("москва"))
    return failure(res, "TEST_MOSCOW_ONLY", "Для доставки до двери используйте тестовый адрес Москвы");
  if (tariff === "self_pickup" && !/^[0-9a-f-]{20,40}$/i.test(destination))
    return failure(res, "INVALID_POINT_ID", "Для доставки в ПВЗ выберите пункт из списка Яндекса");
  try {
    const packing = await calculateOrderPacking(orderNumber);
    if (packing.status !== "calculated" || !packing.parcels?.length || !packing.total_weight_g)
      return failure(res, "PACKING_NOT_READY", `Для заказа нет подходящего расчёта упаковки: ${packing.status}`);
    const stationRows = await prisma.$queryRaw<Array<{primary_dropoff_id:string}>>`
      SELECT primary_dropoff_id FROM yandex_delivery_settings WHERE id = 1`;
    const dropoffStation = stationRows[0]?.primary_dropoff_id;
    // source is the registered Yandex sender station; a preferred physical drop-off PVZ is separate.
    const senderStation = STATION;
    if (!dropoffStation) return failure(res, "SENDER_POINT_REQUIRED", "Сначала сохраните основной ПВЗ отгрузки");
    if (!senderStation) return failure(res, "SENDER_STATION_REQUIRED", "Не задан ID зарегистрированной станции отправителя");
    const places = packing.parcels.map(p => ({ physical_dims: {
      dx: Math.ceil(Number(p.dimensions_cm[0])), dy: Math.ceil(Number(p.dimensions_cm[1])),
      dz: Math.ceil(Number(p.dimensions_cm[2])), weight_gross: Math.ceil(p.weight_g),
    } }));
    if (places.some(p => Object.values(p.physical_dims).some(v => !Number.isFinite(v) || v <= 0)))
      return failure(res, "INVALID_PACKING", "Некорректные габариты или вес грузового места");
    // Yandex expects total_weight to match the sum of gross weights of all places.
    const totalWeightG = places.reduce((sum, place) => sum + place.physical_dims.weight_gross, 0);
    const requestBody: JsonRecord = {
      source: { platform_station_id: senderStation },
      destination: tariff === "self_pickup" ? { platform_station_id: destination } : { address: destination },
      tariff, total_weight: totalWeightG, total_assessed_price: 0,
      client_price: 0, payment_method: "already_paid", places,
    };
    const result = await request("/api/b2b/platform/pricing-calculator", requestBody);
    const details = isRecord(result.data) ? result.data : {};
    const upstreamCode = typeof details.code === "string" ? details.code : null;
    const upstreamMessage = typeof details.message === "string" ? details.message : null;
    const parcelSummary = packing.parcels.map(p => ({ code: p.code, dimensionsCm: p.dimensions_cm, weightG: p.weight_g }));
    if (!result.ok) {
      const unavailable = upstreamCode === "no_delivery_options";
      return res.status(200).json({ data: {
        ok: false, available: false, upstreamStatus: result.status, code: upstreamCode,
        message: unavailable
          ? "Яндекс не предлагает доставку в выбранный ПВЗ. Выберите другой пункт получения."
          : upstreamCode === "dimensions_limit"
            ? "Яндекс отклонил параметры отправления для этого маршрута."
            : upstreamMessage || "Не удалось получить тариф Яндекс Доставки",
        upstreamMessage, parcels: parcelSummary,
        sentPhysicalDims: places.map(p => p.physical_dims), sentTotalWeightG: totalWeightG,
        senderStationId: senderStation, selectedDropoffId: dropoffStation,
        destinationId: tariff === "self_pickup" ? destination : null,
        quoteVersion: "availability-aware-v8",
      } });
    }
    const price = details.pricing_total;
    if (price == null) return res.status(200).json({ data: {
      ok: false, available: false, code: "MISSING_PRICE",
      message: "Яндекс не вернул стоимость доставки", quoteVersion: "availability-aware-v8",
    } });
    res.json({ data: { ok: true, available: true, tariff, parcelCount: places.length, totalWeightG,
      senderStationId: senderStation, selectedDropoffId: dropoffStation, parcels: parcelSummary,
      price, deliveryDays: details.delivery_days ?? null,
      upstreamStatus: result.status, estimatedPacking: true, quoteVersion: "availability-aware-v8" } });
  } catch (error) {
    if (error instanceof Error && /^(ORDER_NOT_FOUND|INVALID_|PACKAGE_)/.test(error.message))
      return failure(res, error.message, error.message, error.message === "ORDER_NOT_FOUND" ? 404 : 400);
    caught(res, error);
  }
});

// Diagnostic only: compare sender station identifiers with the same destination.
// This endpoint never creates, confirms, or modifies a shipment.
router.post("/quote-diagnostics", async (req, res) => {
  res.setHeader("X-Tea-Delivery-Diagnostics-Version", "reference-route-comparison-v7");
  const body = isRecord(req.body) ? req.body : {};
  const orderNumber = stringField(body.orderNumber, 80);
  const destination = stringField(body.destination, 250);
  if (!orderNumber || !destination || !/^[0-9a-f-]{20,40}$/i.test(destination))
    return failure(res, "INVALID_INPUT", "Укажите номер заказа и ID ПВЗ назначения");
  try {
    const packing = await calculateOrderPacking(orderNumber);
    if (packing.status !== "calculated" || !packing.parcels?.length)
      return failure(res, "PACKING_NOT_READY", `Расчёт упаковки недоступен: ${packing.status}`);
    const rows = await prisma.$queryRaw<Array<{primary_dropoff_id:string}>>`
      SELECT primary_dropoff_id FROM yandex_delivery_settings WHERE id = 1`;
    const dropoffId = rows[0]?.primary_dropoff_id;
    if (!dropoffId) return failure(res, "SENDER_POINT_REQUIRED", "Сначала сохраните основной ПВЗ отгрузки");
    const realPlaces = packing.parcels.map(p => ({physical_dims: {
      dx: Math.ceil(Number(p.dimensions_cm[0])),
      dy: Math.ceil(Number(p.dimensions_cm[1])),
      dz: Math.ceil(Number(p.dimensions_cm[2])),
      weight_gross: Math.ceil(p.weight_g),
    }}));
    if (realPlaces.some(p => Object.values(p.physical_dims).some(v => !Number.isFinite(v) || v <= 0)))
      return failure(res, "INVALID_PACKING", "Некорректные размеры или вес упаковки");
    const standardPlaces = [{physical_dims: {dx: 10, dy: 10, dz: 10, weight_gross: 100}}];
    // Official sandbox reference destination from Yandex's access documentation.
    const referenceDestination = "01946f4f013c7337874ec2fb848a58a4";
    const cases = [
      {label: "selected_dropoff_real_box", senderId: dropoffId, destinationId: destination, places: realPlaces},
      {label: "registered_station_real_box", senderId: STATION, destinationId: destination, places: realPlaces},
      {label: "registered_station_standard_box", senderId: STATION, destinationId: destination, places: standardPlaces},
      {label: "official_reference_destination_real_box", senderId: STATION, destinationId: referenceDestination, places: realPlaces},
      {label: "official_reference_destination_standard_box", senderId: STATION, destinationId: referenceDestination, places: standardPlaces},
    ];
    const results = [];
    for (const test of cases) {
      const totalWeight = test.places.reduce((n, p) => n + p.physical_dims.weight_gross, 0);
      const payload: JsonRecord = {
        source: {platform_station_id: test.senderId},
        destination: {platform_station_id: test.destinationId},
        tariff: "self_pickup", total_weight: totalWeight,
        total_assessed_price: 0, client_price: 0,
        payment_method: "already_paid", places: test.places,
      };
      const result = await request("/api/b2b/platform/pricing-calculator", payload);
      const response = isRecord(result.data) ? result.data : {};
      results.push({case: test.label, senderStationId: test.senderId,
        destinationId: test.destinationId, dimensions: test.places.map(p => p.physical_dims),
        totalWeightG: totalWeight, ok: result.ok, upstreamStatus: result.status,
        code: typeof response.code === "string" ? response.code : null,
        message: typeof response.message === "string" ? response.message : null,
        price: result.ok ? response.pricing_total ?? null : null,
        deliveryDays: result.ok ? response.delivery_days ?? null : null});
    }
    res.json({data: {ok: results.some(r => r.ok), diagnosticsVersion: "reference-route-comparison-v7",
      note: "Только предварительный расчёт. Отправления не создаются.", results}});
  } catch (error) { caught(res, error); }
});

export default router;
