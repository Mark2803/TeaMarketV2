import { Router } from "express";
import { prisma } from "../../database/prisma.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { getCustomerOrderByNumber } from "../orders/order-history.service.js";
import { reconcileOzonCheckout } from "./ozon-live.service.js";

/** Compatibility routes backed by the same checkout link as the primary Ozon flow. */
const router = Router();
const validOrderNumber = (value: string) => /^TM-[A-Z0-9-]{8,50}$/.test(value);

type CheckoutLink = { status: string; state: string };

router.get("/orders/:orderNumber/payment-status", authMiddleware, async (req, res) => {
  if (!req.customer?.id) { res.status(401).json({ error: { code: "UNAUTHORIZED" } }); return; }
  const orderNumber = String(req.params.orderNumber ?? "");
  if (!validOrderNumber(orderNumber)) { res.status(400).json({ error: { code: "INVALID_ORDER_NUMBER" } }); return; }
  try {
    const order = await getCustomerOrderByNumber(req.customer.id, orderNumber);
    if (!order) { res.status(404).json({ error: { code: "ORDER_NOT_FOUND" } }); return; }
    const rows = await prisma.$queryRaw<CheckoutLink[]>`
      SELECT l.status, l.state
      FROM ozon_checkout_links l JOIN orders o ON o.id = l.order_id
      WHERE o.order_number = ${orderNumber} AND o.customer_id = ${req.customer.id}::uuid
      LIMIT 1
    `;
    const link = rows[0];
    res.json({ provider: "ozon", linked: Boolean(link), paymentStatus: order.payment_status,
      ...(link ? { providerState: link.status, checkoutState: link.state } : {}) });
  } catch {
    res.status(503).json({ error: { code: "OZON_STATUS_UNAVAILABLE" } });
  }
});

router.post("/orders/:orderNumber/reconcile", authMiddleware, async (req, res) => {
  if (!req.customer?.id) { res.status(401).json({ error: { code: "UNAUTHORIZED" } }); return; }
  const orderNumber = String(req.params.orderNumber ?? "");
  if (!validOrderNumber(orderNumber)) { res.status(400).json({ error: { code: "INVALID_ORDER_NUMBER" } }); return; }
  if (process.env.OZON_STATUS_RECONCILIATION_ENABLED !== "true") {
    res.status(403).json({ error: { code: "OZON_RECONCILIATION_DISABLED" } }); return;
  }
  try {
    const order = await getCustomerOrderByNumber(req.customer.id, orderNumber);
    if (!order) { res.status(404).json({ error: { code: "ORDER_NOT_FOUND" } }); return; }
    const result = await reconcileOzonCheckout(orderNumber, { customerId: req.customer.id });
    res.json({ provider: "ozon", reconciliation: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "OZON_STATUS_UNAVAILABLE";
    res.status(code === "OZON_ORDER_NOT_FOUND" ? 409 : code === "OZON_NOT_CONFIGURED" ? 503 : 503)
      .json({ error: { code: code === "OZON_ORDER_NOT_FOUND" ? "OZON_ORDER_NOT_LINKED" : "OZON_STATUS_UNAVAILABLE" } });
  }
});

export default router;
