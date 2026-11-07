import { advanceOrderStatus } from "./automatic-order-status.js";
import { prisma } from "../../database/prisma.js";

type Shipment = {
  order_id: string;
  request_id: string;
  delivery_status: string;
};

type CarrierEvent = {
  status: string;
  timestamp: Date;
};

const TERMINAL = new Set(["delivered", "returned", "cancelled"]);

function mapStatus(status: string): string | null {
  if (status === "CREATED") return null;

  if (status === "SORTING_CENTER_LOADED") return "in_transit";

  if (["DELIVERED", "DELIVERY_FINISHED"].includes(status)) {
    return "delivered";
  }

  if (["RETURNED", "RETURN_DELIVERED"].includes(status)) {
    return "returned";
  }

  if (["CANCELLED", "CANCELED"].includes(status)) {
    return "cancelled";
  }

  return null;
}

async function synchronize(): Promise<void> {
  const token = process.env.YANDEX_DELIVERY_TEST_TOKEN;
  if (!token) return;

  const shipments = await prisma.$queryRaw<Shipment[]>`
    SELECT s.order_id::text, s.yandex_request_id AS request_id,
           d.status::text AS delivery_status
    FROM yandex_shipments s
    JOIN order_deliveries d ON d.order_id = s.order_id
    JOIN orders o ON o.id = s.order_id
    WHERE s.status = 'submitted'
      AND s.yandex_request_id IS NOT NULL
      AND d.status NOT IN ('returned', 'cancelled')
      AND o.status NOT IN ('completed', 'cancelled')
    ORDER BY s.updated_at DESC
    LIMIT 50
  `;

  for (const shipment of shipments) {
    try {
      const url = new URL(
        "https://b2b.taxi.tst.yandex.net/api/b2b/platform/request/history"
      );
      url.searchParams.set("request_id", shipment.request_id);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Accept-Language": "ru"
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) continue;

      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("state_history" in body)) {
        continue;
      }

      const history = (body as { state_history?: unknown }).state_history;
      if (!Array.isArray(history)) continue;

      const events: CarrierEvent[] = [];

      for (const item of history) {
        if (!item || typeof item !== "object") continue;

        const event = item as Record<string, unknown>;
        if (typeof event.status !== "string") continue;

        const rawTime = event.timestamp_utc;
        const date = typeof rawTime === "string"
          ? new Date(rawTime)
          : typeof event.timestamp === "number"
            ? new Date(event.timestamp * 1000)
            : new Date(NaN);

        if (!Number.isFinite(date.getTime())) continue;

        events.push({ status: event.status, timestamp: date });
      }

      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const latest = events[0];
      if (!latest) continue;

      const nextStatus = mapStatus(latest.status);
      if (!nextStatus) continue;

      // Reconcile order status even when delivery status is already current.
      if (nextStatus === "in_transit" || nextStatus === "delivered") {
        try {
          await advanceOrderStatus(
            shipment.order_id,
            nextStatus === "delivered" ? "completed" : "shipped"
          );
        } catch (error) {
          console.error("YANDEX_ORDER_STATUS_SYNC_ERROR", shipment.order_id, error);
        }
      }

      if (nextStatus === shipment.delivery_status) continue;

      if (TERMINAL.has(shipment.delivery_status)) continue;

      const rank: Record<string, number> = {
        pending: 0,
        preparing: 1,
        handed_over: 2,
        in_transit: 3,
        delivered: 4
      };

      const nextRank = rank[nextStatus];
      const currentRank = rank[shipment.delivery_status];

      if (
        nextRank !== undefined &&
        currentRank !== undefined &&
        nextRank <= currentRank
      ) continue;

      await prisma.order_deliveries.updateMany({
        where: {
          order_id: shipment.order_id,
          status: { notIn: ["delivered", "returned", "cancelled"] }
        },
        data: {
          status: nextStatus,
          ...(nextStatus === "delivered"
            ? { received_at: latest.timestamp }
            : {}),
          updated_at: new Date()
        }
      });

      console.log("YANDEX_DELIVERY_SYNC", shipment.order_id, nextStatus);


    } catch (error) {
      console.warn(
        "YANDEX_DELIVERY_SYNC_ERROR",
        shipment.order_id,
        error instanceof Error ? error.name : "UNKNOWN"
      );
    }
  }
}

let running = false;

export function startYandexDeliverySync(): void {
  if (!process.env.YANDEX_DELIVERY_TEST_TOKEN) return;

  async function run(): Promise<void> {
    if (running) return;
    running = true;

    try {
      await synchronize();
    } catch (error) {
      console.error(
        "YANDEX_DELIVERY_SYNC_FAILED",
        error instanceof Error ? error.name : "UNKNOWN"
      );
    } finally {
      running = false;
    }
  }

  const startup = setTimeout(() => { void run(); }, 5000);
  startup.unref();

  const interval = setInterval(() => { void run(); }, 60000);
  interval.unref();
}
