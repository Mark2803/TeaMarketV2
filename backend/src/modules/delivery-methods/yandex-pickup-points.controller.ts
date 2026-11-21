import type { Request, Response } from "express";

/**
 * Список ПВЗ Яндекс Доставки для карты в оформлении заказа.
 * Только чтение: отправления здесь не создаются.
 *
 * Список большой (вся Россия), поэтому:
 * - храним его в памяти 1 час, а не загружаем у Яндекса для каждого покупателя;
 * - одновременные запросы ждут одну общую загрузку;
 * - если Яндекс временно недоступен, отдаём последний успешный список.
 */

type PickupPoint = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

const CACHE_TTL_MS = 60 * 60 * 1000;

let cache: { expires: number; points: PickupPoint[] } | null = null;
let loading: Promise<PickupPoint[]> | null = null;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function coordinate(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number !== 0 ? number : null;
}

async function fetchPickupPoints(token: string): Promise<PickupPoint[]> {
  const response = await fetch("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pickup-points/list", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "pickup_point", payment_method: "already_paid" }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`YANDEX_POINTS_HTTP_${response.status}`);

  const body = asRecord(await response.json());
  const rows = Array.isArray(body.points) ? body.points : [];
  const points: PickupPoint[] = [];
  for (const row of rows) {
    const point = asRecord(row);
    if (typeof point.id !== "string" || typeof point.name !== "string") continue;
    const address = asRecord(point.address);
    const position = asRecord(point.position);
    points.push({
      id: point.id,
      name: point.name,
      address: typeof address.full_address === "string" ? address.full_address : "",
      city: typeof address.locality === "string" ? address.locality : "",
      latitude: coordinate(position.latitude),
      longitude: coordinate(position.longitude)
    });
  }
  return points;
}

async function getPickupPoints(token: string): Promise<PickupPoint[]> {
  if (cache && Date.now() < cache.expires) return cache.points;
  if (!loading) {
    loading = fetchPickupPoints(token)
      .then((points) => {
        cache = { expires: Date.now() + CACHE_TTL_MS, points };
        return points;
      })
      .finally(() => { loading = null; });
  }
  try {
    return await loading;
  } catch (error) {
    if (cache) {
      console.warn("YANDEX_POINTS_STALE_CACHE", error instanceof Error ? error.message : error);
      return cache.points;
    }
    throw error;
  }
}

export async function yandexPickupPointsController(_req: Request, res: Response): Promise<void> {
  const token = process.env.YANDEX_DELIVERY_TOKEN?.trim();
  if (!token) {
    res.status(503).json({ error: { code: "YANDEX_NOT_CONFIGURED", message: "Доставка временно недоступна" } });
    return;
  }
  try {
    const points = await getPickupPoints(token);
    // Браузер может держать список у себя 10 минут.
    res.setHeader("Cache-Control", "public, max-age=600");
    res.json({ data: { points, mode: "live" } });
  } catch (error) {
    console.error("YANDEX_POINTS_FAILED", error instanceof Error ? error.message : error);
    res.status(502).json({ error: { code: "YANDEX_POINTS_UNAVAILABLE", message: "Не удалось получить пункты выдачи Яндекс Доставки. Попробуйте ещё раз." } });
  }
}
