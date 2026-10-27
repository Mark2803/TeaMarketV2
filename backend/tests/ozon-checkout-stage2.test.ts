import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareOzonCheckoutDraft, ozonIntegrationMode } from "../src/modules/ozon/ozon-checkout.js";

test("preview never activates live mode", () => {
  assert.equal(ozonIntegrationMode({ OZON_INTEGRATION_MODE: "preview" } as NodeJS.ProcessEnv), "preview");
  assert.equal(ozonIntegrationMode({ OZON_INTEGRATION_MODE: "live" } as NodeJS.ProcessEnv), "live");
  assert.throws(() => ozonIntegrationMode({ OZON_INTEGRATION_MODE: "invalid" } as NodeJS.ProcessEnv));
});
test("draft preserves full basket and separates shipping amount", () => {
  const d = prepareOzonCheckoutDraft({orderNumber:"TM-123", items:[
    {name:"Чай 50 г",quantity:2,unitPriceKopecks:30000},
    {name:"Чай 100 г",quantity:1,unitPriceKopecks:45000}
  ],deliveryKopecks:49000});
  assert.equal(d.items.length,2);
  assert.equal(d.itemsTotalKopecks,105000);
  assert.equal(d.payableKopecks,154000);
  assert.equal(d.readyForLive,false);
});
