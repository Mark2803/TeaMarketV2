import {
  apiRequest
} from "./client";

import {
  getAuthHeaders
} from "../../features/auth/auth.storage";

import {
  getGuestCartToken
} from "../../features/cart/cart.token";

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

interface CreateOrderResponse {
  data: CreatedOrderApi;
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
        ...getAuthHeaders()
      },
      body:
        JSON.stringify(payload)
    }
  );
}
