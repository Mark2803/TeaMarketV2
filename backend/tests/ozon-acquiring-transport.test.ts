import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOzonOrder,
  previewOzonCheckoutHandoff,
  simulateOzonCreateOrderResponse
} from "../src/modules/ozon/ozon-acquiring-transport.js";
import type { OzonCreateOrderRequest } from "../src/modules/ozon/ozon-acquiring-client.js";

const dummyRequest = { extId: "TEST-1" } as OzonCreateOrderRequest;

test("guest preview does not require registration or a new token", () => {
  assert.deepEqual(previewOzonCheckoutHandoff(), {
    provider: "ozon", mode: "preview", paymentCreated: false,
    shipmentCreated: false, checkoutUrl: null, reason: "OZON_LIVE_CHECKOUT_NOT_ENABLED"
  });
});
test("parses a fake response from an injected transport", async () => {
  let calls = 0;
  const result = await simulateOzonCreateOrderResponse(dummyRequest, async request => {
    calls++;
    assert.equal(request.extId, "TEST-1");
    return { order: { id: "test-id", payLink: "https://pay.ozon.ru/checkout/test" } };
  });
  assert.equal(calls, 1);
  assert.equal(result.order.id, "test-id");
});
test("rejects untrusted redirect URL", async () => {
  await assert.rejects(
    simulateOzonCreateOrderResponse(dummyRequest, async () => ({
      order: { id: "test-id", payLink: "https://ozon.ru.evil.test" }
    })),
    /OZON_PAY_LINK_UNTRUSTED/
  );
});
test("live creation remains disabled", async () => {
  await assert.rejects(createOzonOrder(dummyRequest), /OZON_LIVE_CHECKOUT_NOT_ENABLED/);
});
