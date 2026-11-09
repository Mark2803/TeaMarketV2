import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { transformSync } from "esbuild";

const require = createRequire(import.meta.url);
const filename = new URL("../src/modules/delivery-methods/yandex-carrier-quote.service.ts", import.meta.url);
const source = readFileSync(filename, "utf8");
const js = transformSync(source, { loader: "ts", format: "cjs", target: "es2022" }).code;
const packing = { status: "calculated", parcels: [{ code: "S", dimensions_cm: [20, 15, 10], weight_g: 350 }] };

function harness({ token = "fake-token", station = "fake-source-station", packingResult = packing, reply = { ok: true, status: 200, body: { pricing_total: "181.78 RUB" } }, networkError = false } = {}) {
  const calls = [];
  const env = { YANDEX_DELIVERY_TOKEN: token, YANDEX_DELIVERY_SOURCE_STATION_ID: station };
  const exports = {};
  const context = {
    exports,
    require: (id) => {
      assert.match(id, /order-packing\.service/);
      return { calculateItemsPacking: async () => packingResult };
    },
    process: { env },
    console: { info() {}, error() {} },
    Date, Math, Number, JSON, Object, String, RegExp, Error,
    AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (networkError) throw new Error("mock network down");
      return { ok: reply.ok, status: reply.status, json: async () => reply.body };
    }
  };
  vm.runInNewContext(js, context, { filename: "yandex-carrier-quote.service.cjs" });
  return { quotePickup: exports.quoteYandexPickup, quoteDoor: exports.quoteYandexDoor, calls };
}
const items = [{ sku: "TEA-1", quantity: 1 }];
const destinationId = "12345678-1234-1234-1234-123456789abc";
async function rejectsCode(promise, code) {
  await assert.rejects(promise, e => e?.code === code);
}

test("PVZ quote uses production host, sender station, correct tariff and packing", async () => {
  const h = harness();
  const result = await h.quotePickup(items, destinationId);
  assert.equal(result.price, 181.78);
  assert.equal(result.deliveryMode, "pickup");
  assert.equal(result.source, "yandex_live");
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, "https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pricing-calculator");
  const payload = JSON.parse(h.calls[0].options.body);
  assert.equal(payload.tariff, "self_pickup");
  assert.equal(payload.source.platform_station_id, "fake-source-station");
  assert.equal(payload.destination.platform_station_id, destinationId);
  assert.equal(payload.places[0].physical_dims.weight_gross, 350);
  assert.equal(payload.places[0].physical_dims.dx, 20);
});

test("door quote uses address and time_interval tariff", async () => {
  const h = harness({ reply: { ok: true, status: 200, body: { pricing_total: 275 } } });
  const result = await h.quoteDoor(items, "Санкт-Петербург, Невский проспект, 10");
  assert.equal(result.price, 275);
  assert.equal(result.deliveryMode, "door");
  const payload = JSON.parse(h.calls[0].options.body);
  assert.equal(payload.tariff, "time_interval");
  assert.equal(payload.destination.address, "Санкт-Петербург, Невский проспект, 10");
});

test("missing token prevents network requests", async () => {
  const h = harness({ token: "" });
  await rejectsCode(h.quotePickup(items, destinationId), "YANDEX_NOT_CONFIGURED");
  assert.equal(h.calls.length, 0);
});

test("missing sender station prevents network requests", async () => {
  const h = harness({ station: "" });
  await rejectsCode(h.quotePickup(items, destinationId), "SOURCE_MISSING");
  assert.equal(h.calls.length, 0);
});

test("invalid destination ID prevents network requests", async () => {
  const h = harness();
  await rejectsCode(h.quotePickup(items, "invalid"), "INVALID_DESTINATION");
  assert.equal(h.calls.length, 0);
});

test("incomplete door address prevents network requests", async () => {
  const h = harness();
  await rejectsCode(h.quoteDoor(items, "дом 5"), "INVALID_ADDRESS");
  assert.equal(h.calls.length, 0);
});

test("unavailable packing prevents network requests", async () => {
  const h = harness({ packingResult: { status: "unavailable", parcels: [] } });
  await rejectsCode(h.quotePickup(items, destinationId), "PACKING_UNAVAILABLE");
  assert.equal(h.calls.length, 0);
});

test("carrier no_delivery_options is propagated", async () => {
  const h = harness({ reply: { ok: false, status: 400, body: { code: "no_delivery_options" } } });
  await rejectsCode(h.quotePickup(items, destinationId), "no_delivery_options");
  assert.equal(h.calls.length, 1);
});

test("carrier unauthorized response is rejected", async () => {
  const h = harness({ reply: { ok: false, status: 401, body: { code: "unauthorized" } } });
  await rejectsCode(h.quotePickup(items, destinationId), "unauthorized");
});

test("network failure is mapped to YANDEX_UNAVAILABLE", async () => {
  const h = harness({ networkError: true });
  await rejectsCode(h.quotePickup(items, destinationId), "YANDEX_UNAVAILABLE");
});

test("non-RUB currency is rejected", async () => {
  const h = harness({ reply: { ok: true, status: 200, body: { pricing_total: "200 USD" } } });
  await rejectsCode(h.quotePickup(items, destinationId), "YANDEX_PRICE_INVALID");
});

test("negative and malformed prices are rejected", async () => {
  for (const pricing_total of [-10, "not-a-price"]) {
    const h = harness({ reply: { ok: true, status: 200, body: { pricing_total } } });
    await rejectsCode(h.quotePickup(items, destinationId), "YANDEX_PRICE_INVALID");
  }
});
