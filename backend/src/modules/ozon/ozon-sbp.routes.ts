import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { guestOrderTokenSchema } from '../orders/order.schemas.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { sbpLiveEnabled } from './ozon-sbp-http.js';
import { previewSbp, createSbp, reconcileSbp, type SbpOwner } from './ozon-sbp.service.js';
const router = Router();
function ownerOf(req: import('express').Request): SbpOwner | null {
  if (req.customer?.id) return { customerId: req.customer.id };
  const raw = req.headers['x-guest-token'];
  const token = guestOrderTokenSchema.safeParse(Array.isArray(raw) ? raw[0] : raw);
  return token.success ? { guestToken: token.data } : null;
}

function numberOf(req: import('express').Request): string | null {
  const p = req.params.orderNumber;
  const n = Array.isArray(p) ? p[0] : p;
  return typeof n === 'string' && /^TM-[A-Z0-9-]{8,46}$/.test(n) ? n : null;
}
function error(res: import('express').Response, err: unknown) {
  const code = err instanceof Error ? err.message : 'OZON_SBP_UNAVAILABLE';
  const status = code.includes('NOT_FOUND') ? 404 : code.includes('LIVE_NOT_ENABLED') ? 503 :
    code.includes('PENDING_RECONCILIATION') ? 409 : 422;
  res.status(status).json({ error: { code } });
}
router.get('/capabilities', (_req, res) => res.json({ provider: 'ozon', integration: 'standalone_sbp', paymentMethod: 'SBP', mode: sbpLiveEnabled() ? 'live' : 'preview', canCreateLivePayment: sbpLiveEnabled(), deliveryViaCheckout: false }));
router.get('/orders/:orderNumber/preview', authMiddleware, async (req, res) => {
  const number = numberOf(req);
  if (!number) { res.status(400).json({ error: { code: 'INVALID_ORDER_NUMBER' } }); return; }
  const owner = ownerOf(req);
  if (!owner) { res.sendStatus(401); return; }
  try { res.json({ data: await previewSbp(number, owner) }); } catch (e) { error(res, e); }
});
router.post('/orders/:orderNumber/payment', authMiddleware, async (req, res) => {
  const number = numberOf(req);
  if (!number) { res.status(400).json({ error: { code: 'INVALID_ORDER_NUMBER' } }); return; }
  const owner = ownerOf(req);
  if (!owner) { res.sendStatus(401); return; }
  try { res.json({ data: await createSbp(number, owner) }); } catch (e) { error(res, e); }
});
router.get('/orders/:orderNumber/payment', authMiddleware, async (req, res) => {
  const number = numberOf(req);
  if (!number) { res.status(400).json({ error: { code: 'INVALID_ORDER_NUMBER' } }); return; }
  const owner = ownerOf(req);
  if (!owner) { res.sendStatus(401); return; }
  try { res.json({ data: await reconcileSbp(number, owner) }); } catch (e) { error(res, e); }
});
router.post('/notifications', async (req, res) => {
  const expected = process.env.OZON_SBP_NOTIFICATION_TOKEN;
  const supplied = req.query.token;
  if (!expected || typeof supplied !== 'string' || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) { res.sendStatus(403); return; }
  const number = req.body?.orderNumber;
  if (typeof number !== 'string' || !/^TM-[A-Z0-9-]{8,46}$/.test(number)) { res.sendStatus(400); return; }
  try { await reconcileSbp(number); res.sendStatus(200); } catch { res.sendStatus(503); }
});
export default router;
