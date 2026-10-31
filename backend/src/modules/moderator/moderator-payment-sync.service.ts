import { prisma } from "../../database/prisma.js";
import { synchronizeYooKassaPayment } from "../orders/yookassa.service.js";

// Prevent duplicate provider requests when dashboard widgets poll simultaneously.
const lastCheck = new Map<string, number>();
const CHECK_INTERVAL_MS = 20_000;

export async function refreshModeratorOrderPayments(orderIds: string[]): Promise<void> {
  if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY || !orderIds.length) return;
  const now = Date.now();
  const payments = await prisma.order_payments.findMany({
    where: {
      order_id: { in: orderIds },
      operation_number: { not: null },
      orders: { payment_status: { not: "paid" } }
    },
    orderBy: { created_at: "desc" },
    select: { order_id: true, operation_number: true }
  });
  const unique = new Map<string, string>();
  for (const payment of payments) {
    if (payment.operation_number && !unique.has(payment.order_id)) unique.set(payment.order_id, payment.operation_number);
  }
  const due = [...unique.values()].filter((id) => now - (lastCheck.get(id) ?? 0) >= CHECK_INTERVAL_MS).slice(0, 20);
  let index = 0;
  async function worker() {
    while (index < due.length) {
      const id = due[index++];
      if (!id) continue;
      lastCheck.set(id, now);
      try {
        await synchronizeYooKassaPayment(id);
      } catch (error) {
        console.error(`YooKassa admin payment synchronization failed for ${id}`, error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, due.length) }, () => worker()));
  if (lastCheck.size > 2000) {
    for (const [id, time] of lastCheck) if (now - time > CHECK_INTERVAL_MS * 3) lastCheck.delete(id);
  }
}
