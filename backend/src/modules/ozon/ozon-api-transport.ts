/**
 * Ozon Acquiring API HTTP adapter. Not wired to public routes.
 * The adapter is deliberately dependency-injected so tests never charge a card.
 * Callers MUST authenticate the customer, persist idempotency keys and reconcile
 * payment statuses before enabling it in an order workflow.
 */
import { parseOzonCreateOrderResponse, type OzonCreateOrderRequest } from './ozon-acquiring-client.js';
import { buildOzonStatusQuery, parseOzonStatusResponse } from './ozon-payment-status.js';

export type OzonHttpPost = (url: string, body: unknown) => Promise<unknown>;
const BASE = 'https://payapi.ozon.ru';

/** Production HTTP implementation; intentionally NOT used by application routes. */
export function makeOzonHttpPost(fetcher: typeof fetch = fetch): OzonHttpPost {
  return async (url, body) => {
    const target = new URL(url);
    if (target.origin !== BASE || !['/v1/createOrder', '/v1/getOrderStatus'].includes(target.pathname)) {
      throw new Error('OZON_ENDPOINT_NOT_ALLOWED');
    }
    const response = await fetcher(target.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: 'error'
    });
    if (!response.ok) throw new Error(`OZON_HTTP_${response.status}`);
    return response.json();
  };
}

/** Can be exercised with a fake post function without network side effects. */
export async function createCheckoutWithTransport(request: OzonCreateOrderRequest, post: OzonHttpPost) {
  if (!request.requestSign || request.mode !== 'MODE_FULL' || request.deliverySettings.isEnabled !== true) {
    throw new Error('OZON_CREATE_REQUEST_INVALID');
  }
  const payload = await post(`${BASE}/v1/createOrder`, request);
  const result = parseOzonCreateOrderResponse(payload);
  if (result.order.extId && result.order.extId !== request.extId) {
    throw new Error('OZON_ORDER_ID_MISMATCH');
  }
  return result;
}

export async function getCheckoutStatusWithTransport(input: {
  accessKey: string; secretKey: string; id?: string; extId?: string;
}, post: OzonHttpPost) {
  const query = buildOzonStatusQuery(input);
  const payload = await post(`${BASE}/v1/getOrderStatus`, query);
  return parseOzonStatusResponse(payload, {
    ...(input.id !== undefined ? { id: input.id } : {}),
    ...(input.extId !== undefined ? { extId: input.extId } : {})
  });
}
