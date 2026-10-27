import assert from "node:assert/strict";
import { test } from "node:test";
import { reconcileOzonOrder } from "../src/modules/ozon/ozon-status-service.js";
import type { OzonPaymentStore } from "../src/modules/ozon/ozon-status-workflow.js";

function fixture() {
  let state: "pending" | "paid" = "pending";
  const store: OzonPaymentStore = {
    async getByOrderNumber(number) {
      return number === "TM-101" ? { orderNumber: number, ozonOrderId: "oz-101", state } : null;
    },
    async compareAndSetState({ expectedState, nextState }) {
      if (state !== expectedState) return false;
      state = nextState as typeof state;
      return true;
    }
  };
  return { store, getState: () => state };
}
test("trusted paid status updates the local state", async () => {
  const f = fixture();
  const result = await reconcileOzonOrder({
    orderNumber: "TM-101", accessKey: "test-access", secretKey: "test-secret",
    store: f.store,
    transport: { async getOrderStatus(request) {
      assert.equal(request.extId, "TM-101");
      assert.equal(request.id, "oz-101");
      assert.ok(request.requestSign);
      return { id: "oz-101", extId: "TM-101", status: "STATUS_PAID", isTestMode: false };
    }}
  });
  assert.deepEqual(result, { outcome: "updated", state: "paid" });
  assert.equal(f.getState(), "paid");
});
test("unrecognized order never contacts Ozon", async () => {
  const f = fixture();
  const result = await reconcileOzonOrder({
    orderNumber: "unknown", accessKey: "test-access", secretKey: "test-secret",
    store: f.store,
    transport: { async getOrderStatus() { throw new Error("unexpected call"); } }
  });
  assert.equal(result.outcome, "not_found");
});
test("mismatched Ozon response cannot update local payment", async () => {
  const f = fixture();
  await assert.rejects(reconcileOzonOrder({
    orderNumber: "TM-101", accessKey: "test-access", secretKey: "test-secret",
    store: f.store,
    transport: { async getOrderStatus() {
      return { id: "oz-OTHER", extId: "TM-101", status: "STATUS_PAID" };
    }}
  }), /OZON_ORDER_ID_MISMATCH/);
  assert.equal(f.getState(), "pending");
});
