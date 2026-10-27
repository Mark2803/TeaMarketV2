/** Ozon standalone SBP API transport. Explicitly disabled unless verified live mode is configured. */
import type { CreateSbpPaymentRequest, GetSbpPaymentDetailsRequest } from './ozon-sbp-payment.js';
export function sbpLiveEnabled(): boolean {
  return process.env.OZON_SBP_MODE === 'live' && process.env.OZON_SBP_LIVE_APPROVED === 'verified_and_enabled' &&
    Boolean(process.env.OZON_ACCESS_KEY && process.env.OZON_SECRET_KEY && process.env.OZON_SBP_REDIRECT_URL);
}
export async function sbpPost(path: '/v1/createPayment' | '/v1/getPaymentDetails', payload: CreateSbpPaymentRequest | GetSbpPaymentDetailsRequest): Promise<unknown> {
  if (!sbpLiveEnabled()) throw new Error('OZON_SBP_LIVE_NOT_ENABLED');
  const response = await fetch(`https://payapi.ozon.ru${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15000), redirect: 'error'
  });
  if (!response.ok) throw new Error(`OZON_SBP_HTTP_${response.status}`);
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new Error('OZON_SBP_NOT_JSON');
  return response.json();
}
