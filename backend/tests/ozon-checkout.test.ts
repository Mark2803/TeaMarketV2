import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareOzonCheckoutDraft, ozonIntegrationMode } from '../src/modules/ozon/ozon-checkout.js';

test('full basket, kopecks, delivery and explicit live blockers', () => {
  const draft = prepareOzonCheckoutDraft({
    orderNumber: 'TM-TEST-001',
    items: [
      { name: 'Шу пуэр 50 г', quantity: 2, unitPriceKopecks: 29990 },
      { name: 'Габа 100 г', quantity: 1, unitPriceKopecks: 65000 }
    ],
    deliveryKopecks: 49000
  });
  assert.equal(draft.itemsTotalKopecks, 124980);
  assert.equal(draft.payableKopecks, 173980);
  assert.equal(draft.items.length, 2);
  assert.equal(draft.missingSellerIdentifiers, 2);
  assert.equal(draft.readyForLive, false);
});

test('no fabricated live integration', () => {
  assert.equal(ozonIntegrationMode({ OZON_INTEGRATION_MODE: 'preview' } as NodeJS.ProcessEnv), 'preview');
  assert.equal(ozonIntegrationMode({ OZON_INTEGRATION_MODE: 'live' } as NodeJS.ProcessEnv), 'live');
  assert.throws(() => ozonIntegrationMode({ OZON_INTEGRATION_MODE: 'invalid' } as NodeJS.ProcessEnv));
  assert.throws(() => prepareOzonCheckoutDraft({orderNumber:'x', items:[{name:'a', quantity:1, unitPriceKopecks:1.2}],deliveryKopecks:0}));
});
