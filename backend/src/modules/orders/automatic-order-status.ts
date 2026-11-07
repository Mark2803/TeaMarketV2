import { prisma } from "../../database/prisma.js";
import { updateModeratorOrderStatus } from "../moderator/moderator-order.service.js";
import { sendOrderStatusEmail } from "../notifications/notification.service.js";
import type { OrderStatus } from "../moderator/moderator-order.schemas.js";

const rank: Record<string, number> = {
  new: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  completed: 4
};

export async function advanceOrderStatus(
  orderId: string,
  nextStatus: OrderStatus
): Promise<void> {
  if (nextStatus === "cancelled") return;

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    select: { order_number: true, status: true, payment_status: true }
  });

  if (!order || order.status === "cancelled" || order.status === "completed") return;
  if (order.payment_status !== "paid") return;

  const currentRank = rank[order.status];
  const nextRank = rank[nextStatus];

  if (currentRank === undefined || nextRank === undefined || nextRank <= currentRank) return;

  const result = await updateModeratorOrderStatus(order.order_number, nextStatus, null, true);
  if (!result.success || result.order.previousStatus === result.order.status) return;

  try {
    await sendOrderStatusEmail(order.order_number, nextStatus);
  } catch (error) {
    console.error("AUTO_ORDER_STATUS_EMAIL_ERROR", orderId, error);
  }

  console.log("AUTO_ORDER_STATUS", order.order_number, nextStatus);
}
