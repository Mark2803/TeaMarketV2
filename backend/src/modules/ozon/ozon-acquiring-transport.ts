/**
 * Safe, opt-in transport adapter for Ozon Acquiring createOrder.
 * The public function cannot make a live request.
 * Inject a fake transport in tests; production wiring requires separate approval.
 */
import {
  parseOzonCreateOrderResponse,
  type OzonCreateOrderRequest,
  type OzonCreateOrderResponse
} from "./ozon-acquiring-client.js";

export type AcquiringPost = (request: OzonCreateOrderRequest) => Promise<unknown>;

export interface CheckoutHandoffResult {
  provider: "ozon";
  mode: "preview";
  paymentCreated: false;
  shipmentCreated: false;
  checkoutUrl: null;
  reason: "OZON_LIVE_CHECKOUT_NOT_ENABLED";
}

export function previewOzonCheckoutHandoff(): CheckoutHandoffResult {
  return {
    provider: "ozon",
    mode: "preview",
    paymentCreated: false,
    shipmentCreated: false,
    checkoutUrl: null,
    reason: "OZON_LIVE_CHECKOUT_NOT_ENABLED"
  };
}

/**
 * Validates an injected test response. Never performs HTTP itself.
 * Must not be wired to production until callback/status reconciliation is ready.
 */
export async function simulateOzonCreateOrderResponse(
  request: OzonCreateOrderRequest,
  fakePost: AcquiringPost
): Promise<OzonCreateOrderResponse> {
  if (process.env.OZON_INTEGRATION_MODE === "live") {
    throw new Error("OZON_LIVE_CHECKOUT_NOT_ENABLED");
  }
  const response = await fakePost(request);
  return parseOzonCreateOrderResponse(response);
}

/** A hard stop for production: no HTTP call, no Ozon order. */
export async function createOzonOrder(_request: OzonCreateOrderRequest): Promise<never> {
  throw new Error("OZON_LIVE_CHECKOUT_NOT_ENABLED");
}
