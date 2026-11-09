import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { getSimulatedTracking, trackingSimulationEnabled } from "./tracking-simulation.js";

type TrackingRow = {
  tracking_number: string | null;
  order_number: string;
  status: string;
  updated_at: Date | null;
  yandex_request_id: string | null;
  shipment_status: string | null;
};
type Event = { status: string; timestamp: string; description?: string };
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};

/** Public endpoint: only the status history of a shipment belonging to this store. */
export async function lookupTracking(req: Request, res: Response) {
  const tracking = typeof req.query.number === "string" ? req.query.number.trim() : "";
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(tracking)) {
    res.status(400).json({ error: { message: "Укажите корректный трек-номер" } });
    return;
  }
  try {
    const rows = await prisma.$queryRaw<TrackingRow[]>`
      SELECT d.tracking_number, o.order_number, d.status::text AS status,
             s.updated_at, s.yandex_request_id, s.status AS shipment_status
      FROM order_deliveries d
      JOIN orders o ON o.id = d.order_id
      LEFT JOIN yandex_shipments s ON s.order_id = o.id
      WHERE (d.tracking_number = ${tracking} OR o.order_number = ${tracking})
      ORDER BY o.ordered_at DESC LIMIT 1`;
    const item = rows[0];
    if (!item) {
      res.status(404).json({ error: { message: "Отправление не найдено" } });
      return;
    }

    const simulation = trackingSimulationEnabled() ? getSimulatedTracking(item.order_number) : null;
    if (simulation) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ data: {
        trackingNumber: item.tracking_number,
        orderNumber: item.order_number,
        status: simulation.status,
        updatedAt: simulation.updatedAt,
        events: simulation.events,
        historyAvailable: true,
        simulated: true,
      } });
      return;
    }

    const events: Event[] = [];
    let historyAvailable = false;
    // Never expose the Yandex token or request_id to the browser.
    const token = process.env.YANDEX_DELIVERY_TOKEN;
    if (item.yandex_request_id && token) {
      try {
        const url = new URL("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/history");
        url.searchParams.set("request_id", item.yandex_request_id);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, "Accept-Language": "ru" },
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          const body = record(await response.json());
          if (Array.isArray(body.state_history)) {
            historyAvailable = true;
            for (const entry of body.state_history.slice(0, 100)) {
              const state = record(entry);
              const status = typeof state.status === "string" ? state.status : "";
              const rawDate = typeof state.timestamp_utc === "string"
                ? state.timestamp_utc
                : typeof state.timestamp === "number"
                  ? new Date(state.timestamp * 1000).toISOString() : "";
              const date = new Date(rawDate);
              if (!/^[A-Z][A-Z0-9_]{1,79}$/.test(status) || !Number.isFinite(date.getTime())) continue;
              // Descriptions may include user-entered text. Only display known carrier status codes.
              events.push({ status, timestamp: date.toISOString() });
            }
            events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
          }
        } else {
          console.warn("YANDEX_TRACKING_HISTORY_HTTP", response.status);
        }
      } catch (error) {
        console.warn("YANDEX_TRACKING_HISTORY_UNAVAILABLE", error instanceof Error ? error.name : "UNKNOWN");
      }
    }

    const shipmentRejected = item.shipment_status === "rejected" && !item.yandex_request_id;
    res.setHeader("Cache-Control", "no-store");
    res.json({ data: {
      trackingNumber: item.tracking_number,
      orderNumber: item.order_number,
      status: shipmentRejected ? "shipment_rejected" : (events[0]?.status ?? item.status),
      shipmentStatus: item.shipment_status,
      updatedAt: events[0]?.timestamp ?? item.updated_at,
      events,
      historyAvailable,
    } });
  } catch (error) {
    console.error("TRACKING_LOOKUP_FAILED", error instanceof Error ? error.name : "UNKNOWN");
    res.status(503).json({ error: { message: "Отслеживание временно недоступно" } });
  }
}
