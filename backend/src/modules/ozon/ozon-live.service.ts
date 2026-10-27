import { createHash } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/prisma.js";
import { buildOzonCreateOrderRequest, parseOzonCreateOrderResponse } from "./ozon-acquiring-client.js";
import { buildOzonStatusQuery, parseOzonStatusResponse } from "./ozon-payment-status.js";
import { prepareOzonCheckoutDraft } from "./ozon-checkout.js";
import { rublesToKopecks } from "./ozon-order-preview.js";

// All live operations require explicit, independently verified merchant setup.
export function ozonLiveReady(): boolean {
  return process.env.OZON_INTEGRATION_MODE === "live" &&
    process.env.OZON_DELIVERY_LIVE_ENABLED === "verified_and_enabled" &&
    process.env.OZON_LIVE_APPROVED === "verified_and_enabled" &&
    Boolean(process.env.OZON_ACCESS_KEY && process.env.OZON_SECRET_KEY && process.env.OZON_ITEMS_JSON &&
      process.env.OZON_FISCALIZATION_TYPE && process.env.OZON_SUCCESS_URL && process.env.OZON_FAIL_URL);
}

type Owner = { customerId?: string; guestToken?: string };
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
function requireOwner(owner: Owner) {
  if (!owner.customerId && !owner.guestToken) throw new Error("OZON_UNAUTHORIZED");
}
function isOwned(order: { customer_id: string | null }, guestHash: string | null, owner: Owner) {
  return order.customer_id ? order.customer_id === owner.customerId :
    Boolean(owner.guestToken && guestHash && tokenHash(owner.guestToken) === guestHash);
}
function itemConfiguration(): Record<string, { extId?: string; sku?: number; vat: string }> {
  const raw: unknown = JSON.parse(process.env.OZON_ITEMS_JSON || "{}");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("OZON_ITEMS_INVALID");
  return raw as Record<string, { extId?: string; sku?: number; vat: string }>;
}
function credentials() {
  if (!ozonLiveReady()) throw new Error("OZON_NOT_CONFIGURED");
  return { accessKey: process.env.OZON_ACCESS_KEY!, secretKey: process.env.OZON_SECRET_KEY! };
}
async function postOzon(path: "/v1/createOrder" | "/v1/getOrderStatus", payload: unknown): Promise<unknown> {
  // The official Ozon Acquiring API endpoint from the supplied documentation.
  const response = await fetch(`https://payapi.ozon.ru${path}`, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15000), redirect: "error"
  });
  if (!response.ok) throw new Error(`OZON_HTTP_${response.status}`);
  return response.json() as Promise<unknown>;
}

type PaymentLinkRow = {
  order_id: string; order_number: string; customer_id: string | null; guest_token_hash: string | null;
  provider_id: string | null; checkout_url: string | null; status: string; state: string;
};
async function getLink(orderNumber: string): Promise<PaymentLinkRow | null> {
  const rows = await prisma.$queryRaw<PaymentLinkRow[]>(Prisma.sql`
    SELECT l.order_id::text, o.order_number, o.customer_id::text, l.guest_token_hash,
           l.provider_id, l.checkout_url, l.status, l.state
    FROM ozon_checkout_links l JOIN orders o ON o.id = l.order_id
    WHERE o.order_number = ${orderNumber} LIMIT 1`);
  return rows[0] ?? null;
}

export async function createOrGetOzonCheckout(orderNumber: string, owner: Owner) {
  requireOwner(owner);
  const config = credentials();
  const order = await prisma.orders.findUnique({
    where: { order_number: orderNumber },
    include: { order_items: true, order_payments: true, order_deliveries: true }
  });
  if (!order) throw new Error("OZON_ORDER_NOT_FOUND");
  const existing = await getLink(orderNumber);
  if (existing && !isOwned(order, existing.guest_token_hash, owner)) throw new Error("OZON_FORBIDDEN");
  if (!existing && (order.customer_id ? order.customer_id !== owner.customerId : !owner.guestToken)) {
    throw new Error("OZON_FORBIDDEN");
  }
  if (existing?.checkout_url && existing.provider_id) {
    return { checkoutUrl: existing.checkout_url, orderNumber, status: existing.status, reused: true };
  }
  if (existing) throw new Error("OZON_CREATION_PENDING_RECONCILIATION");
  if (order.payment_status !== "unpaid") throw new Error("OZON_ALREADY_PROCESSED");
  if (order.order_payments.length !== 1) throw new Error("OZON_PAYMENT_RECORD_INVALID");
  // Ozon computes its own delivery fee in Checkout. Do not charge a legacy shipping tariff.
  if (rublesToKopecks(order.delivery_cost) !== 0) throw new Error("OZON_DELIVERY_COST_MUST_BE_ZERO");
  // Discounts and loyalty are blocked until proportional fiscal line allocation is implemented.
  if (rublesToKopecks(order.discount_total) !== 0 || rublesToKopecks(order.loyalty_spent) !== 0) {
    throw new Error("OZON_DISCOUNT_ALLOCATION_REQUIRED");
  }
  const catalog = itemConfiguration();
  const items = order.order_items.map(item => {
    const entry = catalog[item.sku];
    if (!entry || !entry.vat || (!entry.extId && !entry.sku)) throw new Error(`OZON_ITEM_MAPPING_MISSING:${item.sku}`);
    if (!/^VAT_(NONE|0|5|7|10|20|22|105|107|110|120|122)$/.test(entry.vat)) throw new Error("OZON_VAT_INVALID");
    return { name: item.product_name, quantity: item.quantity, unitPriceKopecks: rublesToKopecks(item.unit_price),
      vat: entry.vat, ...(entry.extId ? { sellerExtId: entry.extId } : {}),
      ...(entry.sku ? { sellerSku: String(entry.sku) } : {}) };
  });
  const draft = prepareOzonCheckoutDraft({ orderNumber, items, deliveryKopecks: 0 });
  if (draft.payableKopecks !== rublesToKopecks(order.total_amount) ||
      draft.itemsTotalKopecks !== rublesToKopecks(order.items_total)) throw new Error("OZON_AMOUNT_MISMATCH");
  const fiscal = process.env.OZON_FISCALIZATION_TYPE;
  if (fiscal !== "FISCAL_TYPE_SINGLE" && fiscal !== "FISCAL_TYPE_DOUBLE") throw new Error("OZON_FISCALIZATION_INVALID");
  const request = buildOzonCreateOrderRequest(draft, {
    ...config, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), fiscalizationType: fiscal,
    successUrl: process.env.OZON_SUCCESS_URL!, failUrl: process.env.OZON_FAIL_URL!,
    ...(process.env.OZON_NOTIFICATION_URL ? { notificationUrl: process.env.OZON_NOTIFICATION_URL } : {})
  });
  // Unique row prevents duplicate provider requests even across processes.
  const reserved = await prisma.$executeRaw(Prisma.sql`
    INSERT INTO ozon_checkout_links (order_id, guest_token_hash, state, status)
    VALUES (${order.id}::uuid, ${owner.guestToken ? tokenHash(owner.guestToken) : null}, 'creating', 'pending')
    ON CONFLICT (order_id) DO NOTHING`);
  if (reserved !== 1) {
    const concurrent = await getLink(orderNumber);
    if (concurrent?.checkout_url) return { checkoutUrl: concurrent.checkout_url, orderNumber, status: concurrent.status, reused: true };
    throw new Error("OZON_CREATION_PENDING_RECONCILIATION");
  }
  // On timeout do NOT retry blindly: Ozon may already have created the order.
  const response = parseOzonCreateOrderResponse(await postOzon("/v1/createOrder", request));
  if (response.order.extId && response.order.extId !== orderNumber) throw new Error("OZON_ORDER_ID_MISMATCH");
  await prisma.$executeRaw(Prisma.sql`
    UPDATE ozon_checkout_links SET provider_id = ${response.order.id}, checkout_url = ${response.order.payLink},
      state = 'created', updated_at = now() WHERE order_id = ${order.id}::uuid AND state = 'creating'`);
  return { checkoutUrl: response.order.payLink, orderNumber, status: "pending", reused: false };
}

export async function reconcileOzonCheckout(orderNumber: string, owner?: Owner) {
  const config = credentials();
  const link = await getLink(orderNumber);
  if (!link) throw new Error("OZON_ORDER_NOT_FOUND");
  if (owner && !isOwned(link, link.guest_token_hash, owner)) throw new Error("OZON_FORBIDDEN");
  if (!link.provider_id) return { orderNumber, status: link.status, state: link.state };
  const query = buildOzonStatusQuery({ ...config, id: link.provider_id, extId: orderNumber });
  const remote = parseOzonStatusResponse(await postOzon("/v1/getOrderStatus", query), { id: link.provider_id, extId: orderNumber });
  const next = remote.status === "STATUS_PAID" && remote.isTestMode === false ? "paid" :
    remote.status === "STATUS_PAID" ? "test_paid" :
    ["STATUS_REFUNDED", "STATUS_PARTITIONAL_REFUND"].includes(remote.status) ? "refunded" :
    ["STATUS_CANCELED", "STATUS_EXPIRED"].includes(remote.status) ? "canceled" : "pending";
  // Do not regress a paid order due to stale notifications.
  const allowed = link.status !== "paid" || next === "paid" || next === "refunded";
  if (!allowed) return { orderNumber, status: link.status, state: link.state };
  await prisma.$transaction(async tx => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE ozon_checkout_links SET status = ${next}, updated_at = now()
      WHERE order_id = ${link.order_id}::uuid AND provider_id = ${link.provider_id}`);
    if (next === "paid") {
      await tx.orders.updateMany({ where: { id: link.order_id, payment_status: "unpaid" }, data: { payment_status: "paid" } });
      await tx.order_payments.updateMany({ where: { order_id: link.order_id, status: "pending" },
        data: { status: "paid", paid_at: new Date(), operation_number: link.provider_id } });
    } else if (next === "refunded" && link.status === "paid") {
      await tx.orders.updateMany({ where: { id: link.order_id, payment_status: "paid" }, data: { payment_status: "refunded" } });
      await tx.order_payments.updateMany({ where: { order_id: link.order_id, status: "paid" }, data: { status: "refunded" } });
    } else if (next === "canceled" && link.status === "pending") {
      await tx.orders.updateMany({ where: { id: link.order_id, payment_status: "unpaid" }, data: { payment_status: "canceled" } });
      await tx.order_payments.updateMany({ where: { order_id: link.order_id, status: "pending" }, data: { status: "canceled" } });
    }
  });
  return { orderNumber, status: next, state: link.state };
}
