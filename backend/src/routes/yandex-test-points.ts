import { Router } from "express";

/** Live Yandex pickup points for customer checkout; no shipments are created. */
const router = Router();
let cache: { expires: number; points: unknown[] } | null = null;
router.get("/points", async (_req, res) => {
  const token = process.env.YANDEX_DELIVERY_TOKEN;
  if (!token) { res.status(503).json({ error: { message: "Токен Яндекс Доставки не настроен" } }); return; }
  try {
    if (cache && Date.now() < cache.expires) { res.json({ data: { points: cache.points, mode: "live" } }); return; }
    const response = await fetch("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pickup-points/list", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pickup_point", payment_method: "already_paid" }), signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) { res.status(502).json({ error: { message: `Яндекс Доставка: HTTP ${response.status}` } }); return; }
    const body: unknown = await response.json();
    const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const rows = Array.isArray(record.points) ? record.points : [];
    const points = rows.filter((p): p is Record<string, unknown> => !!p && typeof p === "object").map(p => {
      const address = p.address && typeof p.address === "object" ? p.address as Record<string, unknown> : {};
      const position = p.position && typeof p.position === "object" ? p.position as Record<string, unknown> : {};
      return { id: p.id, name: p.name, address: address.full_address ?? "", city: address.locality ?? "", latitude: position.latitude ?? null, longitude: position.longitude ?? null };
    }).filter(p => typeof p.id === "string" && typeof p.name === "string" );
    cache = { expires: Date.now() + 300000, points };
    res.json({ data: { points, mode: "live" } });
  } catch { res.status(502).json({ error: { message: "Не удалось получить пункты выдачи Яндекс Доставки" } }); }
});
export default router;
