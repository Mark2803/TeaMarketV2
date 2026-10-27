import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectPersistedOrderForHostedCheckout } from "../src/modules/ozon/ozon-order-readiness.js";

const persisted = {
  order_number: "TM-TEST-6",
  total_amount: "250.00",
  items_total: "250.00",
  delivery_cost: "0.00",
  order_items: [{ product_name: "Чай", quantity: 2, unit_price: "125.00" }]
};

test("reads saved order without enabling Ozon API", () => {
  const result = inspectPersistedOrderForHostedCheckout(persisted);
  assert.equal(result.orderNumber, "TM-TEST-6");
  assert.equal(result.checked.orderAmountKopecks, 25000);
  assert.equal(result.checkoutUrl, null);
  assert.equal(result.liveRequestAllowed, false);
  assert.equal(result.matchesPersistedAmounts, true);
});

test("discount differences remain blockers", () => {
  const result = inspectPersistedOrderForHostedCheckout({ ...persisted, total_amount: "240.00" });
  assert.equal(result.matchesPersistedAmounts, false);
  assert.ok(result.blockers.includes("ITEM_DISCOUNTS_REQUIRE_ALLOCATION"));
});
