import { prisma } from "../../database/prisma.js";

import type {
  OrderStatus
} from "./moderator-order.schemas.js";

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
      error:
        "ORDER_NOT_FOUND";
    };

/**
 * Изменяет статус заказа и сохраняет
 * новое состояние в истории статусов.
 */
export async function updateModeratorOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  cancellationReason?: string | null
): Promise<UpdateModeratorOrderStatusResult> {
  return prisma.$transaction(
    async (transaction) => {
      const order =
        await transaction.orders.findUnique({
          where: {
            order_number:
              orderNumber
          },

          select: {
            id: true,
            order_number: true,
            status: true,
            customer_id: true,
            total_amount: true,
            referral_code: true
          }
        });

      if (!order) {
        return {
          success: false,
          error:
            "ORDER_NOT_FOUND"
        };
      }

      if (order.status === status) {
        return {
          success: true,

          order: {
            id:
              order.id,

            orderNumber:
              order.order_number,

            previousStatus:
              order.status,

            status:
              order.status,

            updatedAt:
              new Date()
          }
        };
      }

      const updatedOrder =
        await transaction.orders.update({
          where: {
            id:
              order.id
          },

          data: {
            status,
            cancellation_reason:
              status === "cancelled"
                ? cancellationReason ?? null
                : null
          },

          select: {
            id: true,
            order_number: true,
            status: true,
            updated_at: true
          }
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

      await transaction
        .order_status_history
        .create({
          data: {
            order_id:
              order.id,

            new_status:
              status
          }
        });

      return {
        success: true,

        order: {
          id:
            updatedOrder.id,

          orderNumber:
            updatedOrder.order_number,

          previousStatus:
            order.status,

          status:
            updatedOrder.status,

          updatedAt:
            updatedOrder.updated_at
        }
      };
    }
  );
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
  | {
      success: false;
      error: "ORDER_NOT_FOUND";
    };

export async function updateModeratorOrderArchive(
  orderNumber: string,
  archived: boolean
): Promise<UpdateModeratorOrderArchiveResult> {
  const order =
    await prisma.orders.findUnique({
      where: {
        order_number:
          orderNumber
      },
      select: {
        id: true,
        order_number: true
      }
    });

  if (!order) {
    return {
      success: false,
      error: "ORDER_NOT_FOUND"
    };
  }

  const updated =
    await prisma.orders.update({
      where: {
        id:
          order.id
      },
      data: {
        is_archived:
          archived,
        archived_at:
          archived
            ? new Date()
            : null
      },
      select: {
        id: true,
        order_number: true,
        is_archived: true,
        archived_at: true
      }
    });

  return {
    success: true,
    order: {
      id:
        updated.id,
      orderNumber:
        updated.order_number,
      isArchived:
        updated.is_archived,
      archivedAt:
        updated.archived_at
    }
  };
}
