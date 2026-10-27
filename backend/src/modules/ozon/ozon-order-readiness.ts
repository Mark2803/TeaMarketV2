import { previewPersistedOrder, type PersistedOrderForOzon, rublesToKopecks } from "./ozon-order-preview.js";
import { inspectHostedCheckout } from "./ozon-hosted-preflight.js";

/** Readiness derived exclusively from server-persisted order values. No external requests. */
export function inspectPersistedOrderForHostedCheckout(order: PersistedOrderForOzon) {
  const preview = previewPersistedOrder(order);
  const readiness = inspectHostedCheckout(preview.draft, rublesToKopecks(order.total_amount));
  return {
    ...readiness,
    orderNumber: order.order_number,
    matchesPersistedAmounts: preview.matchesPersistedAmounts,
    blockers: [
      ...new Set([
        ...readiness.blockers,
        ...(!preview.matchesPersistedAmounts ? ["ITEM_DISCOUNTS_REQUIRE_ALLOCATION" as const] : [])
      ])
    ]
  };
}
