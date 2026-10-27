import { test } from "node:test";
import assert from "node:assert/strict";
import { createLiveOrder, testCreateOrder, OzonHttpError } from "../src/modules/ozon/ozon-http-client.js";
import type { OzonCreateOrderRequest } from "../src/modules/ozon/ozon-acquiring-client.js";

const draft = { extId: "TEST-1" } as OzonCreateOrderRequest;
test("does not perform live checkout", async () => {
  await assert.rejects(createLiveOrder(draft), /OZON_LIVE_CHECKOUT_NOT_ENABLED/);
});
test("fake transport verifies endpoint and parses response", async () => {
  let count = 0;
  const result = await testCreateOrder(draft, async (url, init) => {
    count++;
    assert.equal(url, "https://api-acquiring.ozon.ru/v1/createOrder");
    assert.equal(init.method, "POST");
    return new Response(JSON.stringify({
      order: { id: "test-order", payLink: "https://pay.ozon.ru/checkout/test" }
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(count, 1);
  assert.equal(result.order.id, "test-order");
});
test("rejects non-json and HTTP errors without leaking response", async () => {
  await assert.rejects(testCreateOrder(draft, async () => new Response("error", {
    status: 502, headers: { "content-type": "text/plain" }
  })), (e: unknown) => e instanceof OzonHttpError && e.code === "OZON_HTTP_ERROR");
});
