import { apiRequest } from "./client";
import { getAuthHeaders } from "../../features/auth/auth.storage";
import { getSavedOrderAccess } from "../../features/checkout/order-access.storage";
export interface AccessibleOrder {
  id: string; order_number: string; status: string; payment_status: string;
  total_amount: string; items_total: string; delivery_cost: string; ordered_at: string;
  order_items: Array<{ id: string; product_name: string; quantity: number; line_total: string; weight_g: number | null }>;
}
function headers(id: string, access?: string) {
  return { ...getAuthHeaders(), ...(access || getSavedOrderAccess(id) ? { "x-order-access-token": access || getSavedOrderAccess(id)! } : {}) };
}
export function getAccessibleOrder(id: string, access?: string) {
  return apiRequest<{data: AccessibleOrder}>(`/orders/access/${encodeURIComponent(id)}`, { headers: headers(id, access) });
}
export function payAccessibleOrder(id: string, access?: string) {
  return apiRequest<{data: {confirmationUrl: string}}>(`/orders/access/${encodeURIComponent(id)}/pay`, { method: "POST", headers: headers(id, access) });
}
