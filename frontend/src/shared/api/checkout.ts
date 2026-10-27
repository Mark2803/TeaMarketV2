import {
  apiRequest
} from "./client";

import {
  getAuthHeaders
} from "../../features/auth/auth.storage";

import {
  getGuestCartToken
} from "../../features/cart/cart.token";
import { getAnalyticsSessionId } from "../../features/analytics/analytics";

export interface DeliveryMethodApi {
  id: string;
  name: string;
  baseCost: string;
  deliveryTerm: string | null;
}


export interface DeliveryQuoteApi {
  deliveryMethodId: string;
  deliveryMethodName: string;
  cost: string;
  deliveryTerm: string | null;
  source: string;
}

interface DeliveryQuoteResponse {
  data: DeliveryQuoteApi;
}

export interface PaymentMethodApi {
  id: string;
  name: string;
}

export interface CreatedOrderApi {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  items_total: string;
  delivery_cost: string;
  total_amount: string;
  ordered_at: string;
  order_items: Array<{ id: string; product_name: string; weight_g: number; quantity: number; line_total: string }> | { id: string; product_name: string; weight_g: number; quantity: number; line_total: string } | null;
  order_deliveries: Array<{ id: string; full_address: string; delivery_methods?: { name: string } | null }> | { id: string; full_address: string; delivery_methods?: { name: string } | null } | null;
}

interface DeliveryMethodsResponse {
  data: DeliveryMethodApi[];
}

interface PaymentMethodsResponse {
  data: PaymentMethodApi[];
}

export interface OzonCheckoutPreviewApi {
  provider: "ozon_pay_checkout";
  mode: "preview";
  paymentCreated: false;
  checkoutUrl: null;
  paymentConfirmed: false;
  matchesPersistedAmounts: boolean;
  blockers: string[];
  draft: {
    orderNumber: string;
    itemsTotalKopecks: number;
    payableKopecks: number;
  };
}

interface CreateOrderResponse {
  data: CreatedOrderApi;
  ozonCheckoutPreview?: OzonCheckoutPreviewApi;
  ozonCheckout?: { checkoutUrl: string; orderNumber: string; status: string; reused: boolean };
  ozonCheckoutError?: string;
}

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  email?: string;
  comment?: string;
  deliveryMethodId: string;
  delivery: {
    recipientName: string;
    phone: string;
    fullAddress: string;
    comment?: string;
  };
  paymentMethodId: string;
  promoCode?: string;
  referralCode?: string;
  loyaltyToSpend?: number;
}

export function getDeliveryMethods():
Promise<DeliveryMethodsResponse> {
  return apiRequest<DeliveryMethodsResponse>(
    "/delivery-methods"
  );
}

export function getDeliveryQuote(
  deliveryMethodId: string,
  fullAddress: string
): Promise<DeliveryQuoteResponse> {
  return apiRequest<DeliveryQuoteResponse>(
    "/delivery-methods/quote",
    {
      method: "POST",
      body: JSON.stringify({ deliveryMethodId, fullAddress })
    }
  );
}

export function getPaymentMethods():
Promise<PaymentMethodsResponse> {
  return apiRequest<PaymentMethodsResponse>(
    "/payment-methods"
  );
}

export function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>(
    "/orders",
    {
      method: "POST",
      headers: {
        "x-guest-token":
          getGuestCartToken(),
        "x-analytics-session-id": getAnalyticsSessionId(),
        ...getAuthHeaders()
      },
      body:
        JSON.stringify(payload)
    }
  );
}

export interface PricingQuoteApi { grossItemsTotal:number; itemsTotal:number; deliveryCost:number; discountTotal:number; totalAmount:number; loyaltySpent:number; discounts:Array<{sourceType:string;sourceId:string|null;code:string|null;name:string;amount:number}> }
export function getPricingQuote(payload:{deliveryMethodId:string;promoCode?:string;referralCode?:string;loyaltyToSpend?:number}){return apiRequest<{data:PricingQuoteApi}>("/pricing/quote",{method:"POST",headers:{"x-guest-token":getGuestCartToken(),...getAuthHeaders()},body:JSON.stringify(payload)})}

export function retryOzonCheckout(orderNumber: string) {
  return apiRequest<{data:{checkoutUrl:string;orderNumber:string;status:string;reused:boolean}}>(
    `/ozon/orders/${encodeURIComponent(orderNumber)}/checkout`,
    { method: "POST", headers: { "x-guest-token": getGuestCartToken(), ...getAuthHeaders() } }
  );
}
export function checkOzonPayment(orderNumber: string) {
  return apiRequest<{data:{orderNumber:string;status:string;state:string}}>(
    `/ozon/orders/${encodeURIComponent(orderNumber)}/payment`,
    { headers: { "x-guest-token": getGuestCartToken(), ...getAuthHeaders() } }
  );
}
export function getOzonCapabilities() {
  return apiRequest<{mode:"disabled"|"preview"|"live";canCreateLivePayment:boolean;canCreateLiveShipment:boolean;deliveryViaCheckout:boolean}>("/ozon/capabilities");
}
export interface OzonDiagnosticPreviewPayload {
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceKopecks: number;
    vat?: string;
    sellerSku?: string;
    sellerExtId?: string;
  }>;
  deliveryKopecks: number;
  deliveryEnabled: boolean;
}

export interface OzonDiagnosticPreviewResponse {
  mode: "preview";
  createsOrder: false;
  createsPayment: false;
  createsShipment: false;
  draft: {
    orderNumber: string;
    currency: "RUB";
    itemsTotalKopecks: number;
    deliveryKopecks: number;
    payableKopecks: number;
    deliveryEnabled: boolean;
    missingSellerIdentifiers: number;
    missingVat: number;
    readyForLive: boolean;
  };
}

export function previewOzonCheckout(
  payload: OzonDiagnosticPreviewPayload
): Promise<OzonDiagnosticPreviewResponse> {
  return apiRequest<OzonDiagnosticPreviewResponse>(
    "/ozon/checkout-preview",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export type SbpPaymentResponse = { data: { orderNumber: string; status: string; paymentId: string; sbpPayload: string; reused: boolean } };
export function getSbpCapabilities() {
  return apiRequest<{ mode: "live" | "preview"; canCreateLivePayment: boolean }>("/ozon/sbp/capabilities");
}
export function createSbpPayment(orderNumber: string) {
  return apiRequest<SbpPaymentResponse>(`/ozon/sbp/orders/${encodeURIComponent(orderNumber)}/payment`, {
    method: "POST", headers: { "x-guest-token": getGuestCartToken(), ...getAuthHeaders() }
  });
}
export function checkSbpPayment(orderNumber: string) {
  return apiRequest<{data:{orderNumber:string;status:string;state:string}}>(`/ozon/sbp/orders/${encodeURIComponent(orderNumber)}/payment`, {
    headers: { "x-guest-token": getGuestCartToken(), ...getAuthHeaders() }
  });
}
