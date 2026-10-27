/**
 * Ozon Acquiring API /v1/createOrder (MODE_FULL) — OFFLINE request builder.
 * Source: supplied "Документация Ozon Acquiring API.html", createOrder and signing sections.
 * Intentionally no HTTP transport. A live order could initiate payment or delivery.
 */
import { createHash } from "node:crypto";
import type { CheckoutDraft } from "./ozon-checkout.js";

export interface OzonCreateOrderItem {
  name: string;
  quantity: number;
  price: { currencyCode: "643"; value: string };
  type: "TYPE_PRODUCT";
  vat: string;
  sku?: number;
  extId?: string;
}

export interface OzonCreateOrderRequest {
  accessKey: string;
  amount: { currencyCode: "643"; value: string };
  deliverySettings: { isEnabled: true };
  extId: string;
  mode: "MODE_FULL";
  paymentAlgorithm: "PAY_ALGO_SMS";
  fiscalizationType: "FISCAL_TYPE_SINGLE" | "FISCAL_TYPE_DOUBLE";
  expiresAt: string;
  items: OzonCreateOrderItem[];
  successUrl?: string;
  failUrl?: string;
  notificationUrl?: string;
  requestSign: string;
}

export interface OzonCreateOrderResponse {
  order: {
    id: string;
    extId?: string;
    payLink: string;
    status?: string;
    isTestMode?: boolean;
  };
}

/** Convert integer kopecks into the decimal string used in Ozon amount.value. */
export function kopecksToOzonValue(kopecks: number): string {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) throw new Error("INVALID_OZON_AMOUNT");
  return `${Math.floor(kopecks / 100)}.${String(kopecks % 100).padStart(2, "0")}`;
}

/**
 * Exact concatenation order specified by Ozon for POST /v1/createOrder.
 * SHA-256 lowercase hex; secret is never returned in the payload.
 */
export function signOzonCreateOrder(input: {
  accessKey: string;
  expiresAt: string;
  extId: string;
  fiscalizationType: string;
  paymentAlgorithm: string;
  currencyCode: string;
  amountValue: string;
  secretKey: string;
}): string {
  return createHash("sha256").update(
    input.accessKey + input.expiresAt + input.extId +
    input.fiscalizationType + input.paymentAlgorithm +
    input.currencyCode + input.amountValue + input.secretKey,
    "utf8"
  ).digest("hex");
}

export function buildOzonCreateOrderRequest(
  draft: CheckoutDraft,
  config: {
    accessKey: string;
    secretKey: string;
    expiresAt: string;
    fiscalizationType: "FISCAL_TYPE_SINGLE" | "FISCAL_TYPE_DOUBLE";
    successUrl?: string;
    failUrl?: string;
    notificationUrl?: string;
  }
): OzonCreateOrderRequest {
  if (!config.accessKey || !config.secretKey) throw new Error("OZON_CREDENTIALS_MISSING");
  if (!Number.isFinite(Date.parse(config.expiresAt))) throw new Error("OZON_EXPIRES_AT_INVALID");
  if (!draft.deliveryEnabled) throw new Error("OZON_DELIVERY_DISABLED");
  if (draft.missingVat || draft.missingSellerIdentifiers) throw new Error("OZON_ITEM_DATA_MISSING");
  if (draft.itemsTotalKopecks + draft.deliveryKopecks !== draft.payableKopecks) {
    throw new Error("OZON_AMOUNT_MISMATCH");
  }
  // The amount must reflect the full persisted order; discount reconciliation happens upstream.
  const amountValue = kopecksToOzonValue(draft.payableKopecks);
  const items = draft.items.map((item): OzonCreateOrderItem => {
    const sku = item.sellerSku ? Number(item.sellerSku) : undefined;
    if (item.sellerSku && (!Number.isSafeInteger(sku) || (sku ?? 0) <= 0)) {
      throw new Error("OZON_SKU_INVALID");
    }
    return {
      name: item.name,
      quantity: item.quantity,
      price: { currencyCode: "643", value: kopecksToOzonValue(item.unitPriceKopecks) },
      type: "TYPE_PRODUCT",
      vat: item.vat!,
      ...(sku !== undefined ? { sku } : {}),
      ...(item.sellerExtId ? { extId: item.sellerExtId } : {})
    };
  });
  const paymentAlgorithm = "PAY_ALGO_SMS" as const;
  const requestSign = signOzonCreateOrder({
    accessKey: config.accessKey,
    expiresAt: config.expiresAt,
    extId: draft.orderNumber,
    fiscalizationType: config.fiscalizationType,
    paymentAlgorithm,
    currencyCode: "643",
    amountValue,
    secretKey: config.secretKey
  });
  return {
    accessKey: config.accessKey,
    amount: { currencyCode: "643", value: amountValue },
    deliverySettings: { isEnabled: true },
    extId: draft.orderNumber,
    mode: "MODE_FULL",
    paymentAlgorithm,
    fiscalizationType: config.fiscalizationType,
    expiresAt: config.expiresAt,
    items,
    ...(config.successUrl ? { successUrl: config.successUrl } : {}),
    ...(config.failUrl ? { failUrl: config.failUrl } : {}),
    ...(config.notificationUrl ? { notificationUrl: config.notificationUrl } : {}),
    requestSign
  };
}

/** Validate a future API response without claiming payment has succeeded. */
export function parseOzonCreateOrderResponse(value: unknown): OzonCreateOrderResponse {
  if (!value || typeof value !== "object") throw new Error("OZON_RESPONSE_INVALID");
  const order = (value as Record<string, unknown>).order;
  if (!order || typeof order !== "object") throw new Error("OZON_RESPONSE_INVALID");
  const data = order as Record<string, unknown>;
  if (typeof data.id !== "string" || !data.id.trim() ||
      typeof data.payLink !== "string") throw new Error("OZON_RESPONSE_INVALID");
  let url: URL;
  try { url = new URL(data.payLink); } catch { throw new Error("OZON_PAY_LINK_INVALID"); }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".ozon.ru") && url.hostname !== "ozon.ru") {
    throw new Error("OZON_PAY_LINK_UNTRUSTED");
  }
  return { order: {
    id: data.id,
    payLink: data.payLink,
    ...(typeof data.extId === "string" ? { extId: data.extId } : {}),
    ...(typeof data.status === "string" ? { status: data.status } : {}),
    ...(typeof data.isTestMode === "boolean" ? { isTestMode: data.isTestMode } : {})
  } };
}

/** Deliberately no fetch() call or network configuration at this stage. */
export async function sendOzonCreateOrderDisabled(_request: OzonCreateOrderRequest): Promise<never> {
  throw new Error("OZON_LIVE_CHECKOUT_NOT_ENABLED");
}
