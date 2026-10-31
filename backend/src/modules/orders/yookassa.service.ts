import { prisma } from "../../database/prisma.js";

const API = "https://api.yookassa.ru/v3/payments";

type ProviderPayment = {
  id: string;
  status: string;
  paid?: boolean;
  amount: { value: string; currency: string };
  confirmation?: { confirmation_url?: string };
  metadata?: { order_id?: string };
};

function credentials(): string | null {
  const shop = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  return shop && secret ? `Basic ${Buffer.from(`${shop}:${secret}`).toString("base64")}` : null;
}

async function providerRequest(url: string, options: RequestInit = {}): Promise<ProviderPayment> {
  const authorization = credentials();
  if (!authorization) throw new Error("YOOKASSA_NOT_CONFIGURED");
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: authorization, "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) throw new Error(`YOOKASSA_API_ERROR_${response.status}`);
  return await response.json() as ProviderPayment;
}

export async function initiateYooKassaPayment(orderId: string, returnUrlOverride?: string): Promise<string | null> {
  if (!credentials()) return null;
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: { order_payments: { orderBy: { created_at: "desc" } } }
  });
  if (!order || !order.order_payments.length) throw new Error("ORDER_PAYMENT_NOT_FOUND");
  if (order.payment_status === "paid" || order.status === "cancelled") return null;
  let row = order.order_payments[0];
  // Existing pending payment is reused, never create a second live payment.
  if (row.operation_number) {
    const existing = await providerRequest(`${API}/${encodeURIComponent(row.operation_number)}`);
    if (existing.status === "succeeded") {
      await synchronizeYooKassaPayment(existing.id);
      return null;
    }
    if (existing.status === "pending" || existing.status === "waiting_for_capture") {
      if (existing.confirmation?.confirmation_url) return existing.confirmation.confirmation_url;
      throw new Error("YOOKASSA_PENDING_PAYMENT_NO_URL");
    }
    if (existing.status !== "canceled") throw new Error("YOOKASSA_UNEXPECTED_STATUS");
    await prisma.order_payments.update({ where: { id: row.id }, data: { status: "canceled", updated_at: new Date() } });
    row = await prisma.order_payments.create({
      data: { order_id: order.id, payment_method_id: row.payment_method_id, amount: order.total_amount, status: "pending" }
    });
  } else if (row.status === "canceled") {
    row = await prisma.order_payments.create({
      data: { order_id: order.id, payment_method_id: row.payment_method_id, amount: order.total_amount, status: "pending" }
    });
  }
  // Return to this specific order, not to an empty cart or the storefront root.
  // The frontend can recover the guest access token from localStorage in the same browser.
  const storefrontUrl = process.env.STOREFRONT_URL || process.env.YOOKASSA_RETURN_URL || "https://tea-master-team.ru";
  const orderReturnUrl = `${storefrontUrl.replace(/\/$/, "")}/order/${encodeURIComponent(order.id)}`;
  const returnUrl = returnUrlOverride || orderReturnUrl;
  const payment = await providerRequest(API, {
    method: "POST",
    headers: { "Idempotence-Key": row.id },
    body: JSON.stringify({
      amount: { value: Number(order.total_amount).toFixed(2), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: returnUrl },
      description: `Заказ ${order.order_number}`,
      metadata: { order_id: order.id }
    })
  });
  if (!payment.id || !payment.confirmation?.confirmation_url) throw new Error("YOOKASSA_CONFIRMATION_MISSING");
  await prisma.order_payments.update({
    where: { id: row.id }, data: { operation_number: payment.id, updated_at: new Date() }
  });
  return payment.confirmation.confirmation_url;
}

/** Never trust a webhook payload alone: fetch the payment from YooKassa before changing status. */
export async function synchronizeYooKassaPayment(paymentId: string): Promise<void> {
  if (!credentials()) throw new Error("YOOKASSA_NOT_CONFIGURED");
  const payment = await providerRequest(`${API}/${encodeURIComponent(paymentId)}`);
  if (payment.id !== paymentId || payment.amount.currency !== "RUB") return;
  const record = await prisma.order_payments.findFirst({
    where: { operation_number: paymentId }, include: { orders: true }
  });
  if (!record || payment.metadata?.order_id !== record.order_id) return;
  if (Number(payment.amount.value).toFixed(2) !== Number(record.amount).toFixed(2)) return;
  if (payment.status === "succeeded" && payment.paid === true) {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.order_payments.updateMany({
        where: { id: record.id, status: { not: "succeeded" } },
        data: { status: "succeeded", paid_at: new Date(), updated_at: new Date() }
      });
      if (changed.count) await tx.orders.update({
        where: { id: record.order_id }, data: { payment_status: "paid", updated_at: new Date() }
      });
    });
  } else if (payment.status === "canceled") {
    await prisma.order_payments.updateMany({
      where: { id: record.id, status: { not: "succeeded" } },
      data: { status: "canceled", updated_at: new Date() }
    });
  }
}
