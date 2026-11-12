import { prisma } from "../../database/prisma.js";

import type { OrderStatus } from "./moderator-order.schemas.js";

export type UpdateModeratorOrderStatusResult =
  | {
      success: true;
      order: {
        id: string;
        orderNumber: string;
        previousStatus: string;
        status: string;
        updatedAt: Date;
      };
    }
  | {
      success: false;
      error: "ORDER_NOT_FOUND" | "INVALID_STATUS_TRANSITION" | "PAID_ORDER_CANCELLATION_REQUIRES_REFUND" | "ORDER_ITEM_VARIANT_NOT_FOUND";
    };

/** Changes the order status and records its history atomically. */
export async function updateModeratorOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  cancellationReason?: string | null,
  automatic = false
): Promise<UpdateModeratorOrderStatusResult> {
  return prisma.$transaction(async (transaction) => {
    // Lock for manual and automatic changes to prevent duplicate stock restoration.
    await transaction.$queryRaw`
      SELECT id FROM orders WHERE order_number = ${orderNumber} FOR UPDATE
    `;

    const order = await transaction.orders.findUnique({
      where: { order_number: orderNumber },
      select: {
        id: true,
        order_number: true,
        status: true,
        payment_status: true,
        customer_id: true,
        total_amount: true,
        referral_code: true,
        updated_at: true
      }
    });

    if (!order) return { success: false, error: "ORDER_NOT_FOUND" };

    const result = (currentStatus: string, updatedAt = order.updated_at): UpdateModeratorOrderStatusResult => ({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        previousStatus: order.status,
        status: currentStatus,
        updatedAt
      }
    });

    if (order.status === status) return result(order.status);

    if (order.status === "cancelled" || order.status === "completed") {
      return { success: false, error: "INVALID_STATUS_TRANSITION" };
    }

    if (automatic) {
      const rank: Record<string, number> = {
        new: 0,
        confirmed: 1,
        processing: 2,
        shipped: 3,
        completed: 4
      };
      const currentRank = rank[order.status];
      const nextRank = rank[status];
      if (currentRank === undefined || nextRank === undefined || nextRank <= currentRank) {
        return result(order.status);
      }
    }

    if (status === "cancelled") {
      if (order.status === "shipped") {
        return { success: false, error: "INVALID_STATUS_TRANSITION" };
      }
      if (order.payment_status !== "unpaid" && order.payment_status !== "refunded") {
        return { success: false, error: "PAID_ORDER_CANCELLATION_REQUIRES_REFUND" };
      }

      const items = await transaction.order_items.findMany({
        where: { order_id: order.id },
        select: { sku: true, quantity: true }
      });

      // Validate all variants before restoring any quantity. The transaction rolls back on errors.
      for (const item of items) {
        if (!item.sku || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          return { success: false, error: "ORDER_ITEM_VARIANT_NOT_FOUND" };
        }
        const variant = await transaction.product_variants.findUnique({
          where: { sku: item.sku },
          select: { id: true }
        });
        if (!variant) return { success: false, error: "ORDER_ITEM_VARIANT_NOT_FOUND" };
      }

      for (const item of items) {
        await transaction.product_variants.update({
          where: { sku: item.sku },
          data: { stock_quantity: { increment: item.quantity } }
        });
      }
    }

    const updatedOrder = await transaction.orders.update({
      where: { id: order.id },
      data: {
        status,
        cancellation_reason: status === "cancelled" ? cancellationReason ?? null : null
      },
      select: { id: true, order_number: true, status: true, updated_at: true }
    });

    if (status === "completed" && order.status !== "completed" && order.customer_id) {
      const loyalty = await transaction.loyalty_settings.findUnique({where:{id:1}});
      if (loyalty?.is_active && Number(order.total_amount) >= Number(loyalty.min_order_amount)) {
        const already = await transaction.loyalty_transactions.findFirst({where:{order_id:order.id,type:"earn"}});
        if (!already) {
          const amount = Math.round(Number(order.total_amount) * Number(loyalty.earn_percent)) / 100;
          if (amount > 0) {
            await transaction.loyalty_accounts.upsert({where:{customer_id:order.customer_id},create:{customer_id:order.customer_id,balance:amount},update:{balance:{increment:amount}}});
            await transaction.loyalty_transactions.create({data:{customer_id:order.customer_id,order_id:order.id,type:"earn",amount:amount.toFixed(2),comment:"Начисление за завершённый заказ"}});
          }
        }
      }
      if (order.referral_code) {
        const settings = await transaction.referral_settings.findUnique({where:{id:1}});
        const code = await transaction.referral_codes.findUnique({where:{code:order.referral_code}});
        if (settings?.is_active && code && code.customer_id !== order.customer_id) {
          const existing = await transaction.referrals.findUnique({where:{order_id:order.id}});
          if (!existing) {
            await transaction.referrals.create({data:{code:order.referral_code,inviter_customer_id:code.customer_id,invited_customer_id:order.customer_id,order_id:order.id,status:"rewarded",rewarded_at:new Date()}});
            await transaction.loyalty_accounts.upsert({where:{customer_id:code.customer_id},create:{customer_id:code.customer_id,balance:settings.inviter_bonus},update:{balance:{increment:settings.inviter_bonus}}});
            await transaction.loyalty_transactions.create({data:{customer_id:code.customer_id,order_id:order.id,type:"referral",amount:settings.inviter_bonus,comment:"Бонус за приглашённого покупателя"}});
          }
        }
      }
    }

    await transaction.order_status_history.create({
      data: { order_id: order.id, new_status: status }
    });

    return result(updatedOrder.status, updatedOrder.updated_at);
  });
}

export type UpdateModeratorOrderArchiveResult =
  | {
      success: true;
      order: {
        id: string;
        orderNumber: string;
        isArchived: boolean;
        archivedAt: Date | null;
      };
    }
  | { success: false; error: "ORDER_NOT_FOUND" };

export async function updateModeratorOrderArchive(
  orderNumber: string,
  archived: boolean
): Promise<UpdateModeratorOrderArchiveResult> {
  const order = await prisma.orders.findUnique({
    where: { order_number: orderNumber },
    select: { id: true, order_number: true }
  });

  if (!order) return { success: false, error: "ORDER_NOT_FOUND" };

  const updated = await prisma.orders.update({
    where: { id: order.id },
    data: { is_archived: archived, archived_at: archived ? new Date() : null },
    select: { id: true, order_number: true, is_archived: true, archived_at: true }
  });

  return {
    success: true,
    order: {
      id: updated.id,
      orderNumber: updated.order_number,
      isArchived: updated.is_archived,
      archivedAt: updated.archived_at
    }
  };
}
