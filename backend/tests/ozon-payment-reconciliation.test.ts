import assert from "node:assert/strict";
import { test } from "node:test";
import { decideOzonPaymentReconciliation } from "../src/modules/ozon/ozon-payment-reconciliation.js";
import type { OzonVerifiedStatus } from "../src/modules/ozon/ozon-payment-status.js";

const local = { orderNumber: "TM-101", ozonOrderId: "oz-101", state: "pending" as const };
const remote = (status: OzonVerifiedStatus["status"], isTestMode = false): OzonVerifiedStatus => ({
  id: "oz-101", extId: "TM-101", status, isTestMode,
  paymentConfirmed: status === "STATUS_PAID"
});

test("verified paid status advances pending order", () => {
  assert.deepEqual(decideOzonPaymentReconciliation(local, remote("STATUS_PAID")), {
    action: "apply", nextState: "paid", reason: "PROVIDER_STATUS_VERIFIED"
  });
});
test("same status is idempotent", () => {
  assert.equal(decideOzonPaymentReconciliation(local, remote("STATUS_NEW")).action, "ignore");
});
test("mismatched order ids never update payment", () => {
  assert.equal(decideOzonPaymentReconciliation(local, { ...remote("STATUS_PAID"), extId: "OTHER" }).action, "review");
});
test("late pending status never reverses paid order", () => {
  assert.equal(decideOzonPaymentReconciliation({ ...local, state: "paid" }, remote("STATUS_PAYMENT_PENDING")).action, "review");
});
test("test payment cannot mark production order paid", () => {
  assert.equal(decideOzonPaymentReconciliation(local, remote("STATUS_PAID", true)).action, "review");
});
test("refund after payment is detected", () => {
  assert.equal(decideOzonPaymentReconciliation({ ...local, state: "paid" }, remote("STATUS_REFUNDED")).nextState, "refunded");
});
