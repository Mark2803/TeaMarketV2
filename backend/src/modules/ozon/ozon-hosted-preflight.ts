/**
 * Offline readiness assessment for hosted Ozon Pay Checkout with Ozon Delivery.
 * No API requests, no fabricated payment URL, no orders or shipment creation.
 * Based on Ozon Acquiring API documentation: POST /v1/createOrder.
 */
import type { CheckoutDraft } from "./ozon-checkout.js";

export type HostedBlocker =
  | "ORDER_AMOUNT_MISMATCH"
  | "ITEM_VAT_MISSING"
  | "ITEM_OZON_IDENTIFIER_MISSING"
  | "DELIVERY_NOT_ENABLED"
  | "DELIVERY_COST_NOT_VERIFIED"
  | "OZON_ACCOUNT_DELIVERY_NOT_VERIFIED"
  | "OZON_CATALOG_LINK_NOT_VERIFIED"
  | "LIVE_MODE_DISABLED";

export interface HostedPreflight {
  checkout: "ozon_pay_checkout";
  deliverySelection: "inside_ozon_checkout";
  liveRequestAllowed: false;
  checkoutUrl: null;
  blockers: HostedBlocker[];
  checked: {
    basketLines: number;
    orderAmountKopecks: number;
    currencyCode: "643";
    sellerIdentifiersPresent: boolean;
    vatPresent: boolean;
  };
}

/** Never returns a live-ready flag. This stage intentionally cannot charge money. */
export function inspectHostedCheckout(
  draft: CheckoutDraft,
  persistedOrderTotalKopecks: number
): HostedPreflight {
  const blockers: HostedBlocker[] = [];
  if (draft.payableKopecks !== persistedOrderTotalKopecks) blockers.push("ORDER_AMOUNT_MISMATCH");
  if (draft.missingVat > 0) blockers.push("ITEM_VAT_MISSING");
  if (draft.missingSellerIdentifiers > 0) blockers.push("ITEM_OZON_IDENTIFIER_MISSING");
  if (!draft.deliveryEnabled) blockers.push("DELIVERY_NOT_ENABLED");
  blockers.push(
    "DELIVERY_COST_NOT_VERIFIED",
    "OZON_ACCOUNT_DELIVERY_NOT_VERIFIED",
    "OZON_CATALOG_LINK_NOT_VERIFIED",
    "LIVE_MODE_DISABLED"
  );
  return {
    checkout: "ozon_pay_checkout",
    deliverySelection: "inside_ozon_checkout",
    liveRequestAllowed: false,
    checkoutUrl: null,
    blockers,
    checked: {
      basketLines: draft.items.length,
      orderAmountKopecks: draft.payableKopecks,
      currencyCode: "643",
      sellerIdentifiersPresent: draft.missingSellerIdentifiers === 0,
      vatPresent: draft.missingVat === 0
    }
  };
}
