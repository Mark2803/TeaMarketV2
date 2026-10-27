import assert from 'node:assert/strict';
import test from 'node:test';
import { ozonLiveReady } from '../dist/modules/ozon/ozon-live.service.js';
import { buildOzonCreateOrderRequest, parseOzonCreateOrderResponse } from '../dist/modules/ozon/ozon-acquiring-client.js';
import { prepareOzonCheckoutDraft } from '../dist/modules/ozon/ozon-checkout.js';
import { buildOzonStatusQuery, parseOzonStatusResponse } from '../dist/modules/ozon/ozon-payment-status.js';

test('Ozon live remains disabled without merchant approval', () => {
  const original = process.env.OZON_LIVE_APPROVED;
  delete process.env.OZON_LIVE_APPROVED;
  assert.equal(ozonLiveReady(), false);
  if (original !== undefined) process.env.OZON_LIVE_APPROVED = original;
});
test('Ozon Checkout request uses documented delivery and merchant item identifiers', () => {
  const draft = prepareOzonCheckoutDraft({orderNumber:'TM-20261025-ABC12345',items:[{name:'Чай',quantity:2,unitPriceKopecks:20000,vat:'VAT_0',sellerExtId:'TEA-01'}],deliveryKopecks:0});
  const req = buildOzonCreateOrderRequest(draft, {accessKey:'test',secretKey:'secret',expiresAt:'2027-01-01T00:00:00Z',fiscalizationType:'FISCAL_TYPE_DOUBLE'});
  assert.equal(req.amount.value,'400.00');
  assert.equal(req.deliverySettings.isEnabled,true);
  assert.equal(req.items[0].extId,'TEA-01');
  assert.equal(req.mode,'MODE_FULL');
  assert.equal(req.requestSign.length,64);
});
test('untrusted payment links are rejected', () => {
  assert.throws(() => parseOzonCreateOrderResponse({order:{id:'1',payLink:'https://evil.example/pay'}}),/UNTRUSTED/);
});
test('provider status validates order ids', () => {
  const query = buildOzonStatusQuery({accessKey:'test',secretKey:'secret',id:'oz-1',extId:'TM-1'});
  assert.equal(query.requestSign.length,64);
  assert.throws(() => parseOzonStatusResponse({id:'oz-2',extId:'TM-1',status:'STATUS_PAID'},{id:'oz-1',extId:'TM-1'}),/MISMATCH/);
});
