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
  status: OrderStatus
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
            status: true
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
            status
          },

          select: {
            id: true,
            order_number: true,
            status: true,
            updated_at: true
          }
        });

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