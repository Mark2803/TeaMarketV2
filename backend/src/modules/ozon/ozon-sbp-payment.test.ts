import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  buildCreateSbpPaymentRequest,
  buildGetSbpPaymentDetailsRequest,
  createSbpPaymentDisabled
} from "./ozon-sbp-payment.js";

const credentials = { accessKey: "test-access", secretKey: "test-secret" };
const sign = (value: string) => createHash("sha256").update(value).digest("hex");

test("builds standalone SBP payment without delivery or seller SKU", () => {
  const request = buildCreateSbpPaymentRequest({ extId: "TM-TEST1234", amountKopecks: 125050, redirectUrl: "https://example.com/paid" }, credentials);
  assert.equal(request.payType, "SBP");
  assert.deepEqual(request.amount, { currencyCode: "643", value: "1250.50" });
  assert.equal(request.requestSign, sign("TM-TEST1234test-accesstest-secret"));
  assert.equal("deliverySettings" in request, false);
  assert.equal("items" in request, false);
});

test("builds status query", () => {
  const request = buildGetSbpPaymentDetailsRequest("payment_123", credentials);
  assert.equal(request.requestSign, sign("payment_123test-accesstest-secret"));
});

test("rejects invalid amounts", () => {
  assert.throws(() => buildCreateSbpPaymentRequest({ extId: "TM-TEST1234", amountKopecks: 0, redirectUrl: "https://example.com/paid" }, credentials));
  assert.throws(() => buildCreateSbpPaymentRequest({ extId: "TM-TEST1234", amountKopecks: 1.5, redirectUrl: "https://example.com/paid" }, credentials));
});

test("cannot send live requests", async () => {
  const request = buildCreateSbpPaymentRequest({ extId: "TM-TEST1234", amountKopecks: 100, redirectUrl: "https://example.com/paid" }, credentials);
  await assert.rejects(createSbpPaymentDisabled(request), /OZON_SBP_LIVE_NOT_ENABLED/);
});
