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
  base_cost: string;
  delivery_term: string | null;
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
  created_at: string;
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
