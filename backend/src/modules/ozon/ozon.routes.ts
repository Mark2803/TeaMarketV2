import sbpRouter from "./ozon-sbp.routes.js";
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { ozonLiveReady, createOrGetOzonCheckout, reconcileOzonCheckout } from "./ozon-live.service.js";
import { guestOrderTokenSchema } from "../orders/order.schemas.js";
import { z } from "zod";
import { ozonIntegrationMode, prepareOzonCheckoutDraft } from "./ozon-checkout.js";
import { authMiddleware } from "../auth/auth.middleware.js";
import { getCustomerOrderByNumber } from "../orders/order-history.service.js";
import { inspectPersistedOrderForHostedCheckout } from "./ozon-order-readiness.js";
import { prepareHostedCheckoutHandoff } from "./ozon-hosted-handoff.js";

const router = Router();
const line = z.object({
  name: z.string().trim().min(1).max(255),
  quantity: z.number().int().positive(),
  unitPriceKopecks: z.number().int().nonnegative().safe(),
  vat: z.string().optional(),
  sellerSku: z.string().optional(),
  sellerExtId: z.string().optional()
}).strict();
const preview = z.object({
  orderNumber: z.string().trim().min(1).max(100),
  items: z.array(line).min(1).max(100),
  deliveryKopecks: z.number().int().nonnegative().safe(),
  deliveryEnabled: z.boolean().optional()
}).strict();

// Non-sensitive capabilities only; never reveal tokens or integration credentials.
router.get("/capabilities", (_req, res) => {
  try {
    const mode = ozonIntegrationMode();
    res.json({
      provider: "ozon",
      payment: "ozon_pay_checkout",
      delivery: "ozon_delivery",
      mode,
      canCreateLivePayment: ozonLiveReady(),
      canCreateLiveShipment: false,
      deliveryViaCheckout: ozonLiveReady(),
      pvzWidget: "unverified",
      catalogSynchronization: false
    });
  } catch {
    res.status(503).json({ error: { code: "OZON_CONFIGURATION_ERROR" } });
  }
});

// Diagnostic preview only: client-supplied amounts are NOT trusted for actual orders.
router.post("/checkout-preview", (req, res) => {
  let mode: string;
  try { mode = ozonIntegrationMode(); }
  catch { res.status(503).json({ error: { code: "OZON_CONFIGURATION_ERROR" } }); return; }
  if (mode !== "preview") {
    res.status(403).json({ error: { code: "OZON_PREVIEW_DISABLED" } });
    return;
  }
  const parsed = preview.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_OZON_PREVIEW", details: parsed.error.flatten() } });
    return;
  }
  try {
    const draft = prepareOzonCheckoutDraft(parsed.data);
    res.json({ mode: "preview", createsOrder: false, createsPayment: false, createsShipment: false, draft });
  } catch {
    res.status(400).json({ error: { code: "INVALID_OZON_AMOUNT" } });
  }
});



// Read-only preview for the authenticated owner of a persisted order.
// Guests are intentionally excluded: an order number alone is not proof of ownership.
router.get("/orders/:orderNumber/readiness", authMiddleware, async (req, res) => {
  if (!req.customer?.id) {
    res.status(401).json({ error: { code: "UNAUTHORIZED" } });
    return;
  }
  let mode: string;
  try { mode = ozonIntegrationMode(); }
  catch { res.status(503).json({ error: { code: "OZON_CONFIGURATION_ERROR" } }); return; }
  if (mode !== "preview") {
    res.status(403).json({ error: { code: "OZON_PREVIEW_DISABLED" } });
    return;
  }
  const param = req.params.orderNumber;
  const orderNumber = Array.isArray(param) ? param[0] : param;
  if (!orderNumber || orderNumber.length > 100) {
    res.status(400).json({ error: { code: "INVALID_ORDER_NUMBER" } });
    return;
  }
  try {
    const order = await getCustomerOrderByNumber(req.customer.id, orderNumber);
    if (!order) {
      res.status(404).json({ error: { code: "ORDER_NOT_FOUND" } });
      return;
    }
    const readiness = inspectPersistedOrderForHostedCheckout(order);
    const handoff = prepareHostedCheckoutHandoff(order);
    res.json({
      mode: "preview",
      orderNumber: order.order_number,
      readiness,
      handoff,
      createsOrder: false,
      createsPayment: false,
      createsShipment: false,
      checkoutUrl: null
    });
  } catch {
    res.status(422).json({ error: { code: "OZON_ORDER_PREVIEW_UNAVAILABLE" } });
  }
});

function ownerFromRequest(req: import("express").Request) {
  if (req.customer?.id) return { customerId: req.customer.id };
  const raw = req.headers["x-guest-token"];
  const parsed = guestOrderTokenSchema.safeParse(Array.isArray(raw) ? raw[0] : raw);
  return parsed.success ? { guestToken: parsed.data } : null;
}
function respondError(res: import("express").Response, error: unknown) {
  const code = error instanceof Error ? error.message : "OZON_UNAVAILABLE";
  const status = /FORBIDDEN|UNAUTHORIZED/.test(code) ? 403 : /NOT_FOUND/.test(code) ? 404 :
    /NOT_CONFIGURED/.test(code) ? 503 : /PENDING_RECONCILIATION/.test(code) ? 409 : 422;
  res.status(status).json({ error: { code, message: "Не удалось выполнить операцию Ozon Checkout" } });
}
router.post("/orders/:orderNumber/checkout", authMiddleware, async (req, res) => {
  const owner = ownerFromRequest(req);
  if (!owner) { res.status(401).json({ error: { code: "UNAUTHORIZED" } }); return; }
  const number = String(req.params.orderNumber || "");
  if (!/^TM-[A-Z0-9-]{8,50}$/.test(number)) { res.status(400).json({ error: { code: "INVALID_ORDER_NUMBER" } }); return; }
  try { res.json({ data: await createOrGetOzonCheckout(number, owner) }); }
  catch (error) { respondError(res, error); }
});
router.get("/orders/:orderNumber/payment", authMiddleware, async (req, res) => {
  const owner = ownerFromRequest(req);
  if (!owner) { res.status(401).json({ error: { code: "UNAUTHORIZED" } }); return; }
  const number = String(req.params.orderNumber || "");
  if (!/^TM-[A-Z0-9-]{8,50}$/.test(number)) { res.status(400).json({ error: { code: "INVALID_ORDER_NUMBER" } }); return; }
  try { res.json({ data: await reconcileOzonCheckout(number, owner) }); }
  catch (error) { respondError(res, error); }
});
// Notifications are hints only: never trust an unverified body as proof of payment.
router.post("/notifications", async (req, res) => {
  const expected = process.env.OZON_NOTIFICATION_TOKEN;
  const provided = req.query.token;
  if (!expected || typeof provided !== "string" || Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    res.sendStatus(403); return;
  }
  const extId = req.body?.extId;
  if (typeof extId !== "string" || !/^TM-[A-Z0-9-]{8,50}$/.test(extId)) {
    res.status(400).json({ error: { code: "INVALID_NOTIFICATION" } }); return;
  }
  try { await reconcileOzonCheckout(extId); res.sendStatus(200); }
  catch { res.sendStatus(503); }
});
router.use("/sbp", sbpRouter);
export default router;
