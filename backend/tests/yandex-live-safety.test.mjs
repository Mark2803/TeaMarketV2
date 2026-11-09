import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

const liveModules = [
  "modules/delivery-methods/yandex-carrier-quote.service.ts",
  "modules/moderator/yandex-shipments.routes.ts",
  "modules/moderator/yandex-returns.routes.ts",
  "modules/orders/tracking.controller.ts",
  "modules/orders/yandex-delivery-sync.ts",
];

test("production Yandex modules never call sandbox endpoints", () => {
  for (const name of liveModules) {
    const code = source(name);
    assert.match(code, /b2b-authproxy\.taxi\.yandex\.net/, name);
    assert.match(code, /YANDEX_DELIVERY_TOKEN/, name);
    assert.doesNotMatch(code, /b2b\.taxi\.tst\.yandex\.net|YANDEX_DELIVERY_TEST_TOKEN/, name);
  }
});

test("quote and shipment creation require configured sender station", () => {
  for (const name of [liveModules[0], liveModules[1]]) {
    const code = source(name);
    assert.match(code, /YANDEX_DELIVERY_SOURCE_STATION_ID/, name);
    assert.doesNotMatch(code, /fbed3aa1-2cc6-4370-ab4d-59c5cc9bb924|e1139f6d-e34f-47a9-a55f-31f032a861a6/, name);
  }
});

test("shipment creation reserves order before submitting carrier request", () => {
  const code = source(liveModules[1]);
  const reservation = code.indexOf("INSERT INTO yandex_shipments");
  const submit = code.indexOf("await fetch(requestUrl");
  assert.ok(reservation >= 0, "missing reservation");
  assert.ok(submit > reservation, "carrier request must follow reservation");
  assert.match(code, /ALREADY_SUBMITTED/);
});

test("status sync rejects terminal and regressive delivery updates before advancing order", () => {
  const code = source(liveModules[4]);
  const terminalGuard = code.indexOf("if (TERMINAL.has(shipment.delivery_status)) continue;");
  const regressionGuard = code.indexOf("nextRank < currentRank");
  const advance = code.indexOf("await advanceOrderStatus(");
  assert.ok(terminalGuard >= 0 && regressionGuard > terminalGuard && advance > regressionGuard);
});
