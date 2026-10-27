import assert from "node:assert/strict";
import { test } from "node:test";
import { rublesToKopecks, previewPersistedOrder } from "../src/modules/ozon/ozon-order-preview.js";

test("exact decimal amounts", () => {
 assert.equal(rublesToKopecks("123.45"), 12345);
 assert.equal(rublesToKopecks("0.01"), 1);
 assert.throws(() => rublesToKopecks("1.234"));
});
test("persisted order preview never marks payment successful", () => {
 const result = previewPersistedOrder({ order_number: "TM-123", items_total: "600.00", delivery_cost: "490.00", total_amount: "1090.00", order_items: [{ product_name: "Чай", quantity: 2, unit_price: "300.00" }] });
 assert.equal(result.matchesPersistedAmounts, true);
 assert.equal(result.paymentCreated, false);
 assert.equal(result.paymentConfirmed, false);
 assert.equal(result.checkoutUrl, null);
});
test("discount mismatch blocks readiness", () => {
 const result = previewPersistedOrder({ order_number: "TM-124", items_total: "550.00", delivery_cost: "490.00", total_amount: "1040.00", order_items: [{ product_name: "Чай", quantity: 2, unit_price: "300.00" }] });
 assert.equal(result.matchesPersistedAmounts, false);
 assert.ok(result.blockers.includes("ITEM_DISCOUNTS_REQUIRE_ALLOCATION"));
});
