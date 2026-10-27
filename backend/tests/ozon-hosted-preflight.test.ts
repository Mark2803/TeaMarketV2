import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareOzonCheckoutDraft } from "../src/modules/ozon/ozon-checkout.js";
import { inspectHostedCheckout } from "../src/modules/ozon/ozon-hosted-preflight.js";

test("hosted checkout preflight never enables a real transaction", () => {
  const draft = prepareOzonCheckoutDraft({
    orderNumber: "TM-TEST",
    items: [{ name: "Tea", quantity: 2, unitPriceKopecks: 10000 }],
    deliveryKopecks: 0,
    deliveryEnabled: true
  });
  const result = inspectHostedCheckout(draft, 20000);
  assert.equal(result.liveRequestAllowed, false);
  assert.equal(result.checkoutUrl, null);
  assert.equal(result.deliverySelection, "inside_ozon_checkout");
  assert.ok(result.blockers.includes("ITEM_OZON_IDENTIFIER_MISSING"));
  assert.ok(result.blockers.includes("ITEM_VAT_MISSING"));
});
test("detects mismatch between stored total and checkout amount", () => {
  const draft = prepareOzonCheckoutDraft({
    orderNumber: "TM-TEST",
    items: [{ name: "Tea", quantity: 1, unitPriceKopecks: 10000 }],
    deliveryKopecks: 0
  });
  assert.ok(inspectHostedCheckout(draft, 9000).blockers.includes("ORDER_AMOUNT_MISMATCH"));
});
