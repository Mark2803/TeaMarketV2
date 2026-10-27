/** Offline Ozon Acquiring standalone SBP request builders.
 * No HTTP calls, database writes, routes, or activation switches.
 * Based on supplied Ozon Acquiring API documentation:
 * /v1/createPayment: extId + accessKey + secretKey
 * /v1/getPaymentDetails: id + accessKey + secretKey
 */
import { createHash } from "node:crypto";

export interface SbpCredentials { accessKey: string; secretKey: string }
export interface SbpAmount { currencyCode: "643"; value: string }
export interface CreateSbpPaymentInput {
  extId: string;
  amountKopecks: number;
  redirectUrl: string;
}
export interface CreateSbpPaymentRequest {
  accessKey: string;
  extId: string;
  payType: "SBP";
  amount: SbpAmount;
  requestSign: string;
  redirectUrl: string;
}
export interface GetSbpPaymentDetailsRequest {
  accessKey: string;
  id: string;
  requestSign: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function checkCredentials(credentials: SbpCredentials): void {
  if (!credentials.accessKey || !credentials.secretKey) throw new Error("OZON_SBP_CREDENTIALS_MISSING");
}
function checkIdentifier(value: string, name: string): void {
  if (!value || value.trim() !== value || value.length > 100 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`OZON_SBP_${name}_INVALID`);
  }
}
export function kopecksToSbpAmount(kopecks: number): SbpAmount {
  if (!Number.isSafeInteger(kopecks) || kopecks <= 0) throw new Error("OZON_SBP_AMOUNT_INVALID");
  return { currencyCode: "643", value: `${Math.floor(kopecks / 100)}.${String(kopecks % 100).padStart(2, "0")}` };
}

/** No order is attached: Ozon documentation permits payment without an order. */
export function buildCreateSbpPaymentRequest(
  input: CreateSbpPaymentInput,
  credentials: SbpCredentials
): CreateSbpPaymentRequest {
  checkCredentials(credentials);
  checkIdentifier(input.extId, "EXT_ID");
  if (!/^https:\/\//.test(input.redirectUrl)) throw new Error("OZON_SBP_REDIRECT_URL_INVALID");
  return {
    accessKey: credentials.accessKey,
    extId: input.extId,
    payType: "SBP",
    redirectUrl: input.redirectUrl,
    amount: kopecksToSbpAmount(input.amountKopecks),
    requestSign: sha256(input.extId + credentials.accessKey + credentials.secretKey)
  };
}

export function buildGetSbpPaymentDetailsRequest(
  paymentId: string,
  credentials: SbpCredentials
): GetSbpPaymentDetailsRequest {
  checkCredentials(credentials);
  checkIdentifier(paymentId, "PAYMENT_ID");
  return {
    accessKey: credentials.accessKey,
    id: paymentId,
    requestSign: sha256(paymentId + credentials.accessKey + credentials.secretKey)
  };
}

/** Offline only. A real integration must verify status with Ozon and persist the result atomically. */
export async function createSbpPaymentDisabled(_request: CreateSbpPaymentRequest): Promise<never> {
  throw new Error("OZON_SBP_LIVE_NOT_ENABLED");
}
