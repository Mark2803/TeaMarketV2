/**
 * One-off sandbox label smoke test. No database writes and no production Yandex calls.
 * Reuses the recipient that Yandex TEST has already accepted for the source order,
 * while packing/items are calculated by the same service as production submissions.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/database/prisma.js";
import { calculateOrderPacking } from "../src/modules/moderator/order-packing.service.js";

const host = "https://b2b.taxi.tst.yandex.net";
const originalOrderNumber = "TM-20261108-6C6BF319";
const destinationId = "01946f4f013c7337874ec2fb848a58a4";
const token = process.env.YANDEX_DELIVERY_TEST_TOKEN;
const sourceStation = process.env.YANDEX_DELIVERY_TEST_STATION_ID?.trim() || "fbed3aa1-2cc6-4370-ab4d-59c5cc9bb924";
const obj = (v: unknown): Record<string, any> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};
const call = async (path: string, init: RequestInit) => fetch(host + path, { ...init, signal: AbortSignal.timeout(25000) });

async function main() {
  if (!token) throw new Error("YANDEX_DELIVERY_TEST_TOKEN отсутствует");
  const order = await prisma.orders.findUnique({
    where: { order_number: originalOrderNumber },
    include: { order_items: true, order_deliveries: true },
  });
  if (!order) throw new Error("Исходный заказ отсутствует в локальной БД");
  const shipment = await prisma.$queryRaw<Array<{ yandex_request_id: string | null }>>`
    SELECT yandex_request_id FROM yandex_shipments WHERE order_id=${order.id}::uuid LIMIT 1`;
  const oldId = shipment[0]?.yandex_request_id;
  if (!oldId) throw new Error("Нет идентификатора ранее принятой тестовой заявки");

  const infoUrl = new URL("/api/b2b/platform/request/info", host);
  infoUrl.searchParams.set("request_id", oldId);
  const info = await fetch(infoUrl, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  const infoBody = obj(await info.json());
  if (!info.ok) throw new Error(`TEST INFO HTTP ${info.status}: ${String(infoBody.code ?? "")}`);
  const acceptedRecipient = obj(obj(infoBody.request).recipient_info);
  if (!acceptedRecipient.first_name || !acceptedRecipient.last_name || !acceptedRecipient.phone)
    throw new Error("В ответе Яндекса нет ранее принятого recipient_info");

  const packing = await calculateOrderPacking(originalOrderNumber);
  if (packing.status !== "calculated" || !packing.parcels.length)
    throw new Error(`PACKING: ${packing.status}`);
  const testOrder = "TM-TEST-" + randomUUID().slice(0, 12).toUpperCase();
  const barcodes = packing.parcels.map((_, i) => `${testOrder}-${i + 1}`);
  const quantities = new Map(order.order_items.map(item => [item.sku, item.quantity]));
  const items: Array<Record<string, unknown>> = [];
  for (let i = 0; i < packing.parcels.length; i++) {
    const counts = new Map<string, number>();
    for (const placement of packing.parcels[i]!.placements)
      counts.set(placement.sku, (counts.get(placement.sku) ?? 0) + 1);
    for (const [sku, count] of counts) {
      const line = order.order_items.find(item => item.sku === sku);
      if (!line) throw new Error("PACKING_MISMATCH");
      const unitPrice = Math.round(Number(line.unit_price) * 100);
      items.push({
        count, name: line.product_name, article: sku, place_barcode: barcodes[i],
        billing_details: { unit_price: unitPrice, assessed_unit_price: unitPrice },
      });
      quantities.set(sku, (quantities.get(sku) ?? 0) - count);
    }
  }
  if ([...quantities.values()].some(q => q !== 0)) throw new Error("PACKING_MISMATCH");
  const places = packing.parcels.map((p, i) => ({
    barcode: barcodes[i],
    physical_dims: {
      dx: Math.ceil(Number(p.dimensions_cm[0])),
      dy: Math.ceil(Number(p.dimensions_cm[1])),
      dz: Math.ceil(Number(p.dimensions_cm[2])),
      weight_gross: Math.ceil(Number(p.weight_g)),
    },
  }));
  const payload = {
    info: { operator_request_id: testOrder },
    source: { platform_station: { platform_id: sourceStation } },
    destination: { type: "platform_station", platform_station: { platform_id: destinationId } },
    items, places,
    billing_info: { payment_method: "already_paid", delivery_cost: 0 },
    recipient_info: acceptedRecipient,
    last_mile_policy: "self_pickup",
    particular_items_refuse: false,
    forbid_unboxing: false,
  };
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  console.log("SOURCE ORDER:", originalOrderNumber);
  console.log("TEST ORDER:", testOrder);
  console.log("PACKING:", packing.parcels.length, "parcel(s)");
  const created = await call("/api/b2b/platform/request/create", {
    method: "POST", headers, body: JSON.stringify(payload),
  });
  const createdBody = obj(await created.json());
  console.log("CREATE HTTP:", created.status);
  console.log("CREATE CODE:", createdBody.code ?? "OK");
  if (!created.ok || !createdBody.request_id) {
    console.log("CREATE ERROR:", String(createdBody.message ?? "unknown").slice(0, 250));
    return;
  }
  console.log("TEST REQUEST ID:", createdBody.request_id);
  const labels = await call("/api/b2b/platform/request/generate-labels", {
    method: "POST",
    headers: { ...headers, Accept: "application/pdf" },
    body: JSON.stringify({
      request_ids: [createdBody.request_id],
      generate_type: "one", label_size_mm: "58x40", language: "ru",
    }),
  });
  console.log("PDF HTTP:", labels.status);
  if (!labels.ok) {
    const error = obj(await labels.json().catch(() => ({})));
    console.log("PDF CODE:", error.code ?? "unknown");
    console.log("PDF ERROR:", String(error.message ?? "unknown").slice(0, 250));
    return;
  }
  const pdf = Buffer.from(await labels.arrayBuffer());
  if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");
  const path = resolve("yandex-test-label.pdf");
  writeFileSync(path, pdf);
  console.log("PASS PDF:", path);
}

main().catch(error => {
  console.error("FAIL:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
