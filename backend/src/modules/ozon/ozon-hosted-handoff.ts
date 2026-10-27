/**
 * Hosted Ozon Checkout handoff, offline stage.
 * An explicit non-executable plan, NOT a verified Ozon API request schema.
 * This code never sends HTTP requests or manufactures a checkout URL.
 */
import type { CheckoutDraft } from "./ozon-checkout.js";
import { rublesToKopecks, type PersistedOrderForOzon } from "./ozon-order-preview.js";
import { inspectPersistedOrderForHostedCheckout } from "./ozon-order-readiness.js";

export interface HostedCheckoutHandoff {
  provider: "ozon";
  endpointForFutureIntegration: "POST /v1/createOrder";
  requestSent: false;
  paymentCreated: false;
  shipmentCreated: false;
  checkoutUrl: null;
  deliverySelection: "inside_ozon_checkout";
  orderNumber: string;
  currency: "RUB";
  amountKopecks: number;
  items: CheckoutDraft["items"];
  deliveryRequested: true;
  status: "blocked";
  blockers: string[];
}

/** The persisted order is authoritative; browser amounts must not be passed here. */
export function prepareHostedCheckoutHandoff(order: PersistedOrderForOzon): HostedCheckoutHandoff {
  const readiness = inspectPersistedOrderForHostedCheckout(order);
  const amountKopecks = rublesToKopecks(order.total_amount);
  // This stage deliberately does not infer undocumented Ozon request fields.
  return {
    provider: "ozon",
    endpointForFutureIntegration: "POST /v1/createOrder",
    requestSent: false,
    paymentCreated: false,
    shipmentCreated: false,
    checkoutUrl: null,
    deliverySelection: "inside_ozon_checkout",
    orderNumber: order.order_number,
    currency: "RUB",
    amountKopecks,
    items: order.order_items.map(item => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPriceKopecks: rublesToKopecks(item.unit_price)
    })),
    deliveryRequested: true,
    status: "blocked",
    blockers: readiness.blockers
  };
}

/** Explicitly reject live calls; no external side effects. */
export async function createHostedCheckoutOrder(_handoff: HostedCheckoutHandoff): Promise<never> {
  throw new Error("OZON_LIVE_CHECKOUT_NOT_ENABLED");
}
