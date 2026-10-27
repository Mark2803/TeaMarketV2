import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareHostedCheckoutHandoff, createHostedCheckoutOrder } from "../src/modules/ozon/ozon-hosted-handoff.js";

const saved = {
  order_number: "TM-TEST-7",
  total_amount: "250.00",
  items_total: "250.00",
  delivery_cost: "0.00",
  order_items: [{ product_name: "Tea", quantity: 2, unit_price: "125.00" }]
};

test("handoff uses persisted totals and preserves full item list", () => {
  const handoff = prepareHostedCheckoutHandoff(saved);
  assert.equal(handoff.amountKopecks, 25000);
  assert.equal(handoff.items.length, 1);
  assert.equal(handoff.items[0]?.quantity, 2);
  assert.equal(handoff.deliverySelection, "inside_ozon_checkout");
  assert.equal(handoff.requestSent, false);
  assert.equal(handoff.checkoutUrl, null);
  assert.equal(handoff.status, "blocked");
});

test("live checkout always rejects without contacting Ozon", async () => {
  await assert.rejects(createHostedCheckoutOrder(prepareHostedCheckoutHandoff(saved)), /OZON_LIVE_CHECKOUT_NOT_ENABLED/);
});

test("discount discrepancy remains a blocker", () => {
  const handoff = prepareHostedCheckoutHandoff({ ...saved, total_amount: "200.00" });
  assert.ok(handoff.blockers.includes("ITEM_DISCOUNTS_REQUIRE_ALLOCATION"));
});
