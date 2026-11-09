import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/modules/orders/yandex-delivery-sync.ts", import.meta.url), "utf8");
const js = transformSync(source, { loader: "ts", format: "cjs", target: "es2022" }).code;

function harness({ current = "pending", carrier = "SORTING_CENTER_LOADED", orderStatus = "processing", historyOk = true } = {}) {
  const calls = { updates: [], advances: [], urls: [] };
  const row = { order_id: "fake-order", request_id: "fake-request", delivery_status: current };
  const prisma = {
    $queryRaw: async () => [row],
    order_deliveries: { updateMany: async (args) => { calls.updates.push(args); return { count: 1 }; } }
  };
  const exports = {};
  const module = { exports };
  const context = {
    exports, module,
    require: (id) => {
      if (id.includes("automatic-order-status")) return { advanceOrderStatus: async (...args) => { calls.advances.push(args); } };
      if (id.includes("database/prisma")) return { prisma };
      throw Error("Unexpected import: " + id);
    },
    process: { env: { YANDEX_DELIVERY_TOKEN: "fake-token" } },
    fetch: async (url) => {
      calls.urls.push(String(url));
      return { ok: historyOk, json: async () => ({ state_history: [{ status: carrier, timestamp_utc: "2026-11-09T10:00:00Z" }] }) };
    },
    setTimeout: (fn) => { void Promise.resolve().then(fn); return { unref() {} }; },
    setInterval: () => ({ unref() {} }),
    AbortSignal, URL, Date, console: { log() {}, error() {}, warn() {} }
  };
  vm.runInNewContext(js, context);
  return { start: module.exports.startYandexDeliverySync, calls };
}
async function run(options) {
  const h = harness(options);
  h.start();
  for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
  return h.calls;
}

test("in-transit carrier event advances delivery and order", async () => {
  const calls = await run();
  assert.equal(calls.updates.length, 1);
  assert.equal(calls.updates[0].data.status, "in_transit");
  assert.equal(calls.advances.length, 1);
  assert.equal(calls.advances[0][1], "shipped");
  assert.match(calls.urls[0], /b2b-authproxy\.taxi\.yandex\.net/);
});

test("delivered carrier event completes delivery and order", async () => {
  const calls = await run({ carrier: "DELIVERED", current: "in_transit" });
  assert.equal(calls.updates[0].data.status, "delivered");
  assert.equal(calls.advances[0][1], "completed");
});

test("terminal delivery is not overwritten and order is not advanced", async () => {
  const calls = await run({ current: "delivered", carrier: "SORTING_CENTER_LOADED" });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.advances.length, 0);
});

test("regressive carrier status is ignored", async () => {
  const calls = await run({ current: "in_transit", carrier: "SORTING_CENTER_LOADED" });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.advances.length, 1);
});

test("unrecognized carrier status makes no updates", async () => {
  const calls = await run({ carrier: "CREATED" });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.advances.length, 0);
});

test("failed carrier history request makes no updates", async () => {
  const calls = await run({ historyOk: false });
  assert.equal(calls.updates.length, 0);
  assert.equal(calls.advances.length, 0);
});
