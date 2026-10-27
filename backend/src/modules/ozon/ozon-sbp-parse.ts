/** Treat provider responses as untrusted until obtained directly over trusted API. */
export type SbpCreated = { paymentId: string; payload: string; status: string; isTestMode: boolean | null };
export function parseCreated(value: unknown): SbpCreated {
  if (!value || typeof value !== 'object') throw new Error('OZON_SBP_RESPONSE_INVALID');
  const p = (value as Record<string, unknown>).paymentDetails;
  if (!p || typeof p !== 'object') throw new Error('OZON_SBP_RESPONSE_INVALID');
  const v = p as Record<string, unknown>;
  const sbp = v.sbp as Record<string, unknown> | undefined;
  if (typeof v.paymentId !== 'string' || !v.paymentId || typeof v.status !== 'string' || v.type !== 'SBP' ||
      !sbp || typeof sbp.payload !== 'string' || !sbp.payload) throw new Error('OZON_SBP_RESPONSE_INVALID');
  const order = (value as Record<string, unknown>).order;
  const test = order && typeof order === 'object' ? (order as Record<string, unknown>).isTestMode : undefined;
  return { paymentId: v.paymentId, payload: sbp.payload, status: v.status, isTestMode: typeof test === 'boolean' ? test : null };
}
export type SbpRemoteState = 'paid' | 'pending' | 'rejected' | 'refunded' | 'disputed';
export function parseDetails(value: unknown, expectedKopecks: number): SbpRemoteState {
  if (!value || typeof value !== 'object' || !Array.isArray((value as Record<string, unknown>).items)) throw new Error('OZON_SBP_STATUS_INVALID');
  const items = (value as { items: unknown[] }).items;
  let confirmed = false; let refunded = false; let disputed = false; let rejected = false;
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') throw new Error('OZON_SBP_STATUS_INVALID');
    const item = raw as Record<string, unknown>;
    const amount = item.amount as Record<string, unknown> | undefined;
    if (item.operationType === 'PAYMENT' && item.status === 'PAYMENT_CONFIRMED') {
      if (!amount || amount.currencyCode !== '643' || typeof amount.value !== 'string' ||
          !/^\d+\.\d{2}$/.test(amount.value) || Number(amount.value.replace('.', '')) !== expectedKopecks) {
        throw new Error('OZON_SBP_AMOUNT_MISMATCH');
      }
      confirmed = true;
    }
    if (item.status === 'REFUND_SUCCESS' || item.status === 'CHARGEBACK_SUCCESS') refunded = true;
    if (item.status === 'SBP_DISPUTE_SUCCESS') disputed = true;
    if (item.operationType === 'PAYMENT' && (item.status === 'PAYMENT_REJECTED' || item.status === 'PAYMENT_CANCELED')) rejected = true;
  }
  if (disputed) return 'disputed';
  if (refunded) return 'refunded';
  if (confirmed) return 'paid';
  return rejected ? 'rejected' : 'pending';
}
