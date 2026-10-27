import type { OzonVerifiedStatus } from "./ozon-payment-status.js";
import { decideOzonPaymentReconciliation, type PaymentSnapshot, type ReconciliationDecision } from "./ozon-payment-reconciliation.js";

/** The caller MUST load the payment by an authenticated/authorized order lookup.
 * This module accepts only server-to-server status results, never browser data.
 */
export interface OzonPaymentStore {
  getByOrderNumber(orderNumber: string): Promise<PaymentSnapshot | null>;
  /** Atomic compare-and-swap; persist a new state only if expectedState still matches. */
  compareAndSetState(input: {
    orderNumber: string;
    ozonOrderId: string;
    expectedState: PaymentSnapshot["state"];
    nextState: PaymentSnapshot["state"];
  }): Promise<boolean>;
}

export type StatusSyncResult =
  | { outcome: "not_found" }
  | { outcome: "unchanged" | "manual_review"; reason: string }
  | { outcome: "updated"; state: PaymentSnapshot["state"] }
  | { outcome: "concurrent_change" };

/** No side effects except a single conditional update in the supplied store. */
export async function syncVerifiedOzonPaymentStatus(
  orderNumber: string,
  fetchTrustedStatus: (expected: { id: string; extId: string }) => Promise<OzonVerifiedStatus>,
  store: OzonPaymentStore
): Promise<StatusSyncResult> {
  const local = await store.getByOrderNumber(orderNumber);
  if (!local) return { outcome: "not_found" };
  // Must be fetched from the provider over a trusted server-to-server connection.
  const remote = await fetchTrustedStatus({ id: local.ozonOrderId, extId: local.orderNumber });
  const decision: ReconciliationDecision = decideOzonPaymentReconciliation(local, remote);
  if (decision.action === "review") return { outcome: "manual_review", reason: decision.reason };
  if (decision.action === "ignore") return { outcome: "unchanged", reason: decision.reason };
  const changed = await store.compareAndSetState({
    orderNumber: local.orderNumber,
    ozonOrderId: local.ozonOrderId,
    expectedState: local.state,
    nextState: decision.nextState
  });
  return changed ? { outcome: "updated", state: decision.nextState } : { outcome: "concurrent_change" };
}
