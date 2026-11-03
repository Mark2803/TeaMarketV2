import { apiRequest } from "./client";
export interface TrackingResult {
  simulated?: boolean;
  orderNumber?: string;
  trackingNumber: string;
  status: string;
  updatedAt: string | null;
  events: Array<{ status: string; timestamp: string; location?: string }>;
}
export async function findTracking(number: string): Promise<TrackingResult> {
  const result = await apiRequest<{ data: TrackingResult }>("/orders/tracking", { query: { number } });
  return result.data;
}
