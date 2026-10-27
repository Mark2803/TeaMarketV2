import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareOzonCheckoutDraft } from "../src/modules/ozon/ozon-checkout.js";
import {
  buildOzonCreateOrderRequest, kopecksToOzonValue, parseOzonCreateOrderResponse,
  sendOzonCreateOrderDisabled, signOzonCreateOrder
} from "../src/modules/ozon/ozon-acquiring-client.js";

const draft = prepareOzonCheckoutDraft({
  orderNumber: "TM-123",
  items: [{ name: "Tea", quantity: 2, unitPriceKopecks: 12550, vat: "VAT_0", sellerSku: "123456" }],
  deliveryKopecks: 0,
  deliveryEnabled: true
});
const config = {
  accessKey: "test-access",
  secretKey: "test-secret",
  expiresAt: "2026-10-15T12:00:00Z",
  fiscalizationType: "FISCAL_TYPE_SINGLE" as const
};
test("formats kopecks exactly", () => {
  assert.equal(kopecksToOzonValue(25100), "251.00");
  assert.equal(kopecksToOzonValue(1), "0.01");
});
test("builds full hosted checkout with Ozon Delivery and signs it", () => {
  const request = buildOzonCreateOrderRequest(draft, config);
  assert.equal(request.mode, "MODE_FULL");
  assert.equal(request.deliverySettings.isEnabled, true);
  assert.equal(request.amount.value, "251.00");
  assert.equal(request.items[0]?.sku, 123456);
  assert.equal(request.items[0]?.price.value, "125.50");
  assert.equal(request.requestSign, signOzonCreateOrder({
    accessKey: config.accessKey, expiresAt: config.expiresAt, extId: "TM-123",
    fiscalizationType: config.fiscalizationType, paymentAlgorithm: "PAY_ALGO_SMS",
    currencyCode: "643", amountValue: "251.00", secretKey: config.secretKey
  }));
  assert.equal(JSON.stringify(request).includes(config.secretKey), false);
});
test("missing seller mapping is blocked", () => {
  const missing = prepareOzonCheckoutDraft({
    orderNumber: "TM-124", items: [{ name: "Tea", quantity: 1, unitPriceKopecks: 100, vat: "VAT_0" }],
    deliveryKopecks: 0
  });
  assert.throws(() => buildOzonCreateOrderRequest(missing, config), /OZON_ITEM_DATA_MISSING/);
});
test("validates payment link without marking payment as paid", () => {
  const result = parseOzonCreateOrderResponse({
    order: { id: "ozon-order-1", payLink: "https://pay.ozon.ru/checkout/example", status: "STATUS_NEW" }
  });
  assert.equal(result.order.status, "STATUS_NEW");
  assert.throws(() => parseOzonCreateOrderResponse({
    order: { id: "1", payLink: "https://ozon.ru.evil.example/pay" }
  }), /OZON_PAY_LINK_UNTRUSTED/);
});
test("never sends an order to Ozon", async () => {
  await assert.rejects(
    sendOzonCreateOrderDisabled(buildOzonCreateOrderRequest(draft, config)),
    /OZON_LIVE_CHECKOUT_NOT_ENABLED/
  );
});
