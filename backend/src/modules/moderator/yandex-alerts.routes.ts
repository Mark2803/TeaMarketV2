import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();
type AlertRow = {
  order_id: string;
  order_number: string;
  shipment_status: string | null;
  error_code: string | null;
  fingerprint: string;
  resolved_reason: string | null;
  resolved_at: Date | null;
};

const alertsSql = `
  SELECT o.id AS order_id, o.order_number,
         s.status AS shipment_status, s.error_code,
         concat_ws(':', coalesce(s.status, 'missing'), coalesce(s.error_code, '')) AS fingerprint,
         CASE WHEN r.fingerprint = concat_ws(':', coalesce(s.status, 'missing'), coalesce(s.error_code, ''))
              THEN r.reason ELSE NULL END AS resolved_reason,
         CASE WHEN r.fingerprint = concat_ws(':', coalesce(s.status, 'missing'), coalesce(s.error_code, ''))
              THEN r.resolved_at ELSE NULL END AS resolved_at
  FROM orders o
  JOIN order_deliveries d ON d.order_id = o.id
  LEFT JOIN LATERAL (
    SELECT status, error_code FROM yandex_shipments
    WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
  ) s ON true
  LEFT JOIN yandex_alert_resolutions r ON r.order_id = o.id
  WHERE o.payment_status = 'paid'
    AND (d.delivery_service ILIKE '%yandex%'
      OR d.delivery_service ILIKE '%яндекс%'
      OR d.full_address LIKE '[ПВЗ Яндекс %')
    AND (s.status IS NULL OR s.status IN ('rejected', 'uncertain'))
  ORDER BY o.ordered_at DESC
  LIMIT 200
`;

router.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRawUnsafe<AlertRow[]>(alertsSql);
    res.setHeader("Cache-Control", "no-store");
    res.json({ data: rows.filter(row => !row.resolved_reason) });
  } catch (error) { next(error); }
});

router.post("/:orderNumber/resolve", async (req, res, next) => {
  try {
    const reason = req.body?.reason;
    if (reason !== "test_order" && reason !== "manual_delivery") {
      res.status(400).json({ error: { message: "Выберите причину закрытия" } });
      return;
    }
    const orderNumber = String(req.params.orderNumber);
    const rows = await prisma.$queryRawUnsafe<AlertRow[]>(alertsSql);
    const row = rows.find(item => item.order_number === orderNumber);
    if (!row) {
      res.status(404).json({ error: { message: "Активная ошибка не найдена" } });
      return;
    }
    await prisma.$executeRaw`
      INSERT INTO yandex_alert_resolutions (order_id, fingerprint, reason, resolved_at)
      VALUES (${row.order_id}::uuid, ${row.fingerprint}, ${reason}, now())
      ON CONFLICT (order_id) DO UPDATE
      SET fingerprint = EXCLUDED.fingerprint, reason = EXCLUDED.reason, resolved_at = now()
    `;
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
