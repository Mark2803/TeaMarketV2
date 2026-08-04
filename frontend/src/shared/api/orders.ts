import {
  apiRequest
} from "./client";

import {
  getAuthHeaders
} from "../../features/auth/auth.storage";

export interface CustomerOrderItemApi {
  id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  weight_g: number | null;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface CustomerOrderDeliveryApi {
  status: string;
  tracking_number: string | null;
  delivery_service: string | null;
  delivery_methods: {
    id: string;
    name: string;
  } | null;
}

export interface CustomerOrderListItemApi {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  items_total: string;
  delivery_cost: string;
  total_amount: string;
  ordered_at: string;
  order_items: CustomerOrderItemApi[];
  order_deliveries: CustomerOrderDeliveryApi[];
}

export interface CustomerOrderPaymentApi {
  id: string;
  amount: string;
  status: string;
  created_at: string;
  payment_methods: {
    id: string;
    name: string;
  } | null;
}

export interface CustomerOrderStatusHistoryApi {
  id: string;
  new_status: string;
  changed_at: string;
}

export interface CustomerOrderDetailsApi {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  comment: string | null;
  status: string;
  payment_status: string;
  items_total: string;
  delivery_cost: string;
  total_amount: string;
  ordered_at: string;
  created_at: string;
  updated_at: string;
  order_items: CustomerOrderItemApi[];
  order_deliveries: Array<
    CustomerOrderDeliveryApi & {
      id: string;
      recipient_name: string;
      phone: string;
      full_address: string;
      comment: string | null;
      cost: string;
    }
  >;
  order_payments: CustomerOrderPaymentApi[];
  order_status_history: CustomerOrderStatusHistoryApi[];
}

interface CustomerOrdersResponse {
  data: CustomerOrderListItemApi[];
}

interface CustomerOrderDetailsResponse {
  data: CustomerOrderDetailsApi;
}

export function getCustomerOrders():
Promise<CustomerOrdersResponse> {
  return apiRequest<CustomerOrdersResponse>(
    "/orders/my",
    {
      headers:
        getAuthHeaders()
    }
  );
}

export function getCustomerOrder(
  orderNumber: string
): Promise<CustomerOrderDetailsResponse> {
  return apiRequest<CustomerOrderDetailsResponse>(
    `/orders/my/${encodeURIComponent(orderNumber)}`,
    {
      headers:
        getAuthHeaders()
    }
  );
}
