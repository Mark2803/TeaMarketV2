import { createHash } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { updateModeratorOrderStatus } from "./moderator-order.service.js";

type Refund = { id: string; status: string; payment_id: string; amount: { value: string; currency: string } };
type Payment = { id: string; status: string; paid?: boolean; amount: { value: string; currency: string }; refundable?: boolean };

async function request<T>(path: string, method = "GET", body?: unknown, key?: string): Promise<T> {
  const shop = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shop || !secret) throw new Error("YOOKASSA_NOT_CONFIGURED");
  const response = await fetch(`https://api.yookassa.ru/v3/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${shop}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(key ? { "Idempotence-Key": key } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { code?: string; description?: string };
    throw new Error(`YOOKASSA_REFUND_API_${response.status}:${error.code ?? "unknown"}`);
  }
  return await response.json() as T;
}

/** Never mark an order cancelled before YooKassa confirms the full refund. */
export async function refundAndCancelOrder(orderNumber: string, reason: string) {
  const order = await prisma.orders.findUnique({
    where: { order_number: orderNumber },
    include: { order_payments: { orderBy: { created_at: "desc" } }, order_items: true }
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === "cancelled") return { alreadyCancelled: true, order: { status: "cancelled" } };
  if (["shipped", "completed"].includes(order.status)) throw new Error("ORDER_CANNOT_BE_CANCELLED");
  if (order.payment_status !== "paid" && order.payment_status !== "refunded") throw new Error("PAYMENT_NOT_PAID");
  const payment = order.order_payments.find(p => p.status === "succeeded" || p.status === "refunded");
  if (!payment?.operation_number) throw new Error("YOOKASSA_PAYMENT_ID_MISSING");
  // Validate stock mapping before any irreversible external refund.
  for (const item of order.order_items) {
    if (!item.sku || item.quantity <= 0 || !await prisma.product_variants.findUnique({ where: { sku: item.sku }, select: { id: true } })) {
      throw new Error("ORDER_ITEM_VARIANT_NOT_FOUND");
    }
  }
  const providerPayment = await request<Payment>(`payments/${encodeURIComponent(payment.operation_number)}`);
  const amount = Number(order.total_amount).toFixed(2);
  if (providerPayment.id !== payment.operation_number || providerPayment.amount.currency !== "RUB" || Number(providerPayment.amount.value).toFixed(2) !== amount) {
    throw new Error("YOOKASSA_PAYMENT_MISMATCH");
  }
  const refunds = await request<{ items: Refund[] }>(`refunds?payment_id=${encodeURIComponent(payment.operation_number)}&limit=100`);
  const successful = refunds.items.filter(r => r.status === "succeeded");
  const pending = refunds.items.filter(r => r.status === "pending");
  const refundedTotal = successful.reduce((sum, r) => sum + Math.round(Number(r.amount.value) * 100), 0);
  const total = Math.round(Number(amount) * 100);
  if (pending.length) throw new Error("YOOKASSA_REFUND_PENDING");
  if (refundedTotal > total || (refundedTotal > 0 && refundedTotal < total)) throw new Error("YOOKASSA_PARTIAL_REFUND_REQUIRES_REVIEW");
  if (refundedTotal === 0) {
    if (providerPayment.status !== "succeeded" || providerPayment.paid !== true) throw new Error("YOOKASSA_PAYMENT_NOT_SUCCEEDED");
    const key = createHash("sha256").update(`tea-market-full-refund:${payment.operation_number}`).digest("hex").slice(0, 64);
    const refund = await request<Refund>("refunds", "POST", {
      payment_id: payment.operation_number,
      amount: { value: amount, currency: "RUB" },
      description: `Отмена заказа ${orderNumber}`
    }, key);
    if (refund.status !== "succeeded") throw new Error("YOOKASSA_REFUND_PENDING");
  }
  await prisma.$transaction(async tx => {
    await tx.order_payments.update({ where: { id: payment.id }, data: { status: "refunded", updated_at: new Date() } });
    await tx.orders.update({ where: { id: order.id }, data: { payment_status: "refunded", updated_at: new Date() } });
  });
  const result = await updateModeratorOrderStatus(orderNumber, "cancelled", reason);
  if (!result.success) throw new Error(result.error);
  return { alreadyCancelled: false, order: result.order };
}
