/**
 * Pure Ozon payment reconciliation policy.
 * Input status MUST come from a trusted server-to-server Ozon API response.
 * This module never modifies a database and never trusts browser callbacks.
 */
import type { OzonVerifiedStatus } from "./ozon-payment-status.js";

export type LocalPaymentState =
  | "pending" | "authorized" | "paid" | "canceled" | "refunded" | "disputed";

export interface PaymentSnapshot {
  orderNumber: string;
  ozonOrderId: string;
  state: LocalPaymentState;
}

export interface ReconciliationDecision {
  action: "apply" | "ignore" | "review";
  nextState: LocalPaymentState;
  reason: string;
}

const stateByProviderStatus: Record<OzonVerifiedStatus["status"], LocalPaymentState> = {
  STATUS_NEW: "pending",
  STATUS_PAYMENT_PENDING: "pending",
  STATUS_AUTHORIZED: "authorized",
  STATUS_PAID: "paid",
  STATUS_CANCELED: "canceled",
  STATUS_EXPIRED: "canceled",
  STATUS_PARTITION_CANCELED: "canceled",
  STATUS_REFUNDED: "refunded",
  STATUS_PARTITIONAL_REFUND: "refunded",
  STATUS_DISPUTED: "disputed",
  STATUS_DISPUTING: "disputed"
};

export function decideOzonPaymentReconciliation(
  local: PaymentSnapshot,
  remote: OzonVerifiedStatus
): ReconciliationDecision {
  if (local.orderNumber !== remote.extId || local.ozonOrderId !== remote.id) {
    return { action: "review", nextState: local.state, reason: "ORDER_ID_MISMATCH" };
  }
  const next = stateByProviderStatus[remote.status];
  if (local.state === next) {
    return { action: "ignore", nextState: local.state, reason: "ALREADY_RECONCILED" };
  }
  // A delayed provider status must never reverse a confirmed payment.
  if (local.state === "paid" && (next === "pending" || next === "authorized" || next === "canceled")) {
    return { action: "review", nextState: local.state, reason: "PAID_STATE_REGRESSION" };
  }
  // A refund, dispute, or cancellation cannot be silently reversed by a delayed notification.
  if (["refunded", "disputed", "canceled"].includes(local.state) && next !== local.state) {
    return { action: "review", nextState: local.state, reason: "TERMINAL_STATE_CHANGE" };
  }
  if (next === "refunded" && local.state !== "paid") {
    return { action: "review", nextState: local.state, reason: "REFUND_REQUIRES_REVIEW" };
  }
  if (next === "paid" && remote.isTestMode === true) {
    return { action: "review", nextState: local.state, reason: "TEST_PAYMENT_NOT_PRODUCTION" };
  }
  return { action: "apply", nextState: next, reason: "PROVIDER_STATUS_VERIFIED" };
}
