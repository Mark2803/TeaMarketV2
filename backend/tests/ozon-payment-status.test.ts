import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildOzonStatusQuery, parseOzonStatusResponse, fetchOzonStatusDisabled
} from "../src/modules/ozon/ozon-payment-status.js";

test("signs status query in documented order without exposing secret", () => {
  const query = buildOzonStatusQuery({ accessKey: "access", secretKey: "secret", extId: "TM-123" });
  assert.equal(query.requestSign, createHash("sha256").update("TM-123accesssecret").digest("hex"));
  assert.equal(JSON.stringify(query).includes("secret"), false);
});
test("refuses status query without order identifier", () => {
  assert.throws(() => buildOzonStatusQuery({ accessKey: "a", secretKey: "b" }), /OZON_ORDER_ID_MISSING/);
});
test("paid and authorized are distinct", () => {
  const expected = { extId: "TM-123" };
  const response = (status: string) => ({ id: "ozon-id", extId: "TM-123", status, isTestMode: true });
  assert.equal(parseOzonStatusResponse(response("STATUS_PAID"), expected).paymentConfirmed, true);
  for (const status of ["STATUS_NEW", "STATUS_PAYMENT_PENDING", "STATUS_AUTHORIZED", "STATUS_REFUNDED", "STATUS_CANCELED"]) {
    assert.equal(parseOzonStatusResponse(response(status), expected).paymentConfirmed, false);
  }
});
test("refuses mismatched order identifiers and unknown status", () => {
  assert.throws(() => parseOzonStatusResponse({ id: "1", extId: "OTHER", status: "STATUS_PAID" }, { extId: "TM-123" }), /OZON_ORDER_ID_MISMATCH/);
  assert.throws(() => parseOzonStatusResponse({ id: "1", extId: "TM-123", status: "PAID" }, { extId: "TM-123" }), /OZON_STATUS_INVALID/);
});
test("never calls live status API", async () => {
  const query = buildOzonStatusQuery({ accessKey: "a", secretKey: "b", extId: "TM-123" });
  await assert.rejects(fetchOzonStatusDisabled(query), /OZON_LIVE_STATUS_NOT_ENABLED/);
});
