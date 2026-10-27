import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCheckoutWithTransport, getCheckoutStatusWithTransport, makeOzonHttpPost } from '../src/modules/ozon/ozon-api-transport.js';
import type { OzonCreateOrderRequest } from '../src/modules/ozon/ozon-acquiring-client.js';

const request: OzonCreateOrderRequest = {
  accessKey: 'test-key', amount: { currencyCode: '643', value: '100.00' },
  deliverySettings: { isEnabled: true }, extId: 'TEST-123', mode: 'MODE_FULL',
  paymentAlgorithm: 'PAY_ALGO_SMS', fiscalizationType: 'FISCAL_TYPE_SINGLE',
  expiresAt: '2026-11-01T00:00:00Z', items: [], requestSign: 'test-sign'
};
test('validates checkout response and keeps Ozon order identity', async () => {
  const result = await createCheckoutWithTransport(request, async (url, body) => {
    assert.equal(url, 'https://payapi.ozon.ru/v1/createOrder');
    assert.equal((body as OzonCreateOrderRequest).extId, 'TEST-123');
    return { order: { id: 'OZ-1', extId: 'TEST-123', payLink: 'https://pay.ozon.ru/checkout/example' } };
  });
  assert.equal(result.order.id, 'OZ-1');
});
test('rejects mismatched Ozon external order id', async () => {
  await assert.rejects(createCheckoutWithTransport(request, async () => ({
    order: { id: 'OZ-1', extId: 'OTHER', payLink: 'https://pay.ozon.ru/checkout/example' }
  })), /OZON_ORDER_ID_MISMATCH/);
});
test('status verification never treats authorized as paid', async () => {
  const result = await getCheckoutStatusWithTransport({ accessKey: 'key', secretKey: 'secret', extId: 'TEST-123' },
    async (url) => {
      assert.equal(url, 'https://payapi.ozon.ru/v1/getOrderStatus');
      return { id: 'OZ-1', extId: 'TEST-123', status: 'STATUS_AUTHORIZED', isTestMode: true };
    });
  assert.equal(result.paymentConfirmed, false);
});
test('production transport restricts destinations and rejects redirects', async () => {
  const post = makeOzonHttpPost();
  await assert.rejects(post('https://attacker.example/v1/createOrder', {}), /OZON_ENDPOINT_NOT_ALLOWED/);
});
