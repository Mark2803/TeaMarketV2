import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCreated, parseDetails } from './ozon-sbp-parse.js';
test('reads payment ID and SBP payload', () => {
  assert.deepEqual(parseCreated({ paymentDetails: { paymentId: 'id1', type: 'SBP', status: 'PAYMENT_NEW', sbp: { payload: 'https://qr.nspk.ru/abc' } } }),
    { paymentId: 'id1', payload: 'https://qr.nspk.ru/abc', status: 'PAYMENT_NEW', isTestMode: null });
});
test('only confirmed matching amount is paid', () => {
  assert.equal(parseDetails({ items: [{ operationType: 'PAYMENT', status: 'PAYMENT_CONFIRMED', amount: { currencyCode: '643', value: '1250.50' } }] }, 125050), 'paid');
  assert.equal(parseDetails({ items: [{ operationType: 'PAYMENT', status: 'PAYMENT_AUTHORIZED' }] }, 125050), 'pending');
  assert.throws(() => parseDetails({ items: [{ operationType: 'PAYMENT', status: 'PAYMENT_CONFIRMED', amount: { currencyCode: '643', value: '100.00' } }] }, 125050), /AMOUNT_MISMATCH/);
});
test('refund and dispute override confirmation', () => {
  const paid = { operationType: 'PAYMENT', status: 'PAYMENT_CONFIRMED', amount: { currencyCode: '643', value: '1.00' } };
  assert.equal(parseDetails({ items: [paid, { operationType: 'REFUND', status: 'REFUND_SUCCESS' }] }, 100), 'refunded');
});
