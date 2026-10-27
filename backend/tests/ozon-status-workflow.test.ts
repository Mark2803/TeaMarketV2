import assert from "node:assert/strict";
import { test } from "node:test";
import { syncVerifiedOzonPaymentStatus, type OzonPaymentStore } from "../src/modules/ozon/ozon-status-workflow.js";
import type { OzonVerifiedStatus } from "../src/modules/ozon/ozon-payment-status.js";
import type { PaymentSnapshot } from "../src/modules/ozon/ozon-payment-reconciliation.js";

function makeStore(initial: PaymentSnapshot | null) {
  let record = initial;
  let updates = 0;
  const store: OzonPaymentStore = {
    async getByOrderNumber(number) { return record?.orderNumber === number ? { ...record } : null; },
    async compareAndSetState({ orderNumber, ozonOrderId, expectedState, nextState }) {
      if (!record || record.orderNumber !== orderNumber || record.ozonOrderId !== ozonOrderId || record.state !== expectedState) return false;
      record = { ...record, state: nextState }; updates++; return true;
    }
  };
  return { store, getUpdates: () => updates, getRecord: () => record };
}
const base: PaymentSnapshot = { orderNumber: "TM-1", ozonOrderId: "OZ-1", state: "pending" };
const status = (value: OzonVerifiedStatus["status"], extId = "TM-1"): OzonVerifiedStatus => ({
  id: "OZ-1", extId, status: value, isTestMode: false, paymentConfirmed: value === "STATUS_PAID"
});

test("applies verified paid state once", async () => {
  const db = makeStore(base);
  const trusted = async () => status("STATUS_PAID");
  assert.deepEqual(await syncVerifiedOzonPaymentStatus("TM-1", trusted, db.store), { outcome: "updated", state: "paid" });
  assert.equal((await syncVerifiedOzonPaymentStatus("TM-1", trusted, db.store)).outcome, "unchanged");
  assert.equal(db.getUpdates(), 1);
});
test("unknown order does not call provider", async () => {
  const db = makeStore(null); let called = false;
  const result = await syncVerifiedOzonPaymentStatus("TM-1", async () => { called = true; return status("STATUS_PAID"); }, db.store);
  assert.equal(result.outcome, "not_found"); assert.equal(called, false);
});
test("mismatched order is sent for review", async () => {
  const db = makeStore(base);
  const result = await syncVerifiedOzonPaymentStatus("TM-1", async () => status("STATUS_PAID", "WRONG"), db.store);
  assert.equal(result.outcome, "manual_review"); assert.equal(db.getUpdates(), 0);
});
test("stale status cannot roll paid back", async () => {
  const db = makeStore({ ...base, state: "paid" });
  const result = await syncVerifiedOzonPaymentStatus("TM-1", async () => status("STATUS_PAYMENT_PENDING"), db.store);
  assert.equal(result.outcome, "manual_review"); assert.equal(db.getUpdates(), 0);
});
test("concurrent state changes are not overwritten", async () => {
  const db = makeStore(base);
  const store: OzonPaymentStore = { ...db.store, compareAndSetState: async () => false };
  assert.equal((await syncVerifiedOzonPaymentStatus("TM-1", async () => status("STATUS_PAID"), store)).outcome, "concurrent_change");
});
