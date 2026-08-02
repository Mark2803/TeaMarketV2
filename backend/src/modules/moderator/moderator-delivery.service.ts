import { prisma } from "../../database/prisma.js";

import type {
  UpdateDeliveryInput
} from "./moderator-delivery.schemas.js";

export type UpdateModeratorDeliveryResult =
  | {
      success: true;
      delivery: {
        id: string;
        orderId: string;
        status: string;
        deliveryService: string | null;
        trackingNumber: string | null;
        handedOverAt: Date | null;
        receivedAt: Date | null;
        updatedAt: Date;
      };
    }
  | {
      success: false;
      error:
        "ORDER_NOT_FOUND"
        | "DELIVERY_NOT_FOUND";
    };

/**
 * Обновляет данные доставки заказа модератором.
 */
export async function updateModeratorDelivery(
  orderNumber: string,
  input: UpdateDeliveryInput
): Promise<UpdateModeratorDeliveryResult> {
  return prisma.$transaction(
    async (transaction) => {
      const order =
        await transaction.orders.findUnique({
          where: {
            order_number:
              orderNumber
          },

          select: {
            id: true
          }
        });

      if (!order) {
        return {
          success: false,
          error:
            "ORDER_NOT_FOUND"
        };
      }

      const delivery =
        await transaction
          .order_deliveries
          .findUnique({
            where: {
              order_id:
                order.id
            },

            select: {
              id: true
            }
          });

      if (!delivery) {
        return {
          success: false,
          error:
            "DELIVERY_NOT_FOUND"
        };
      }

      const updatedDelivery =
        await transaction
          .order_deliveries
          .update({
            where: {
              id:
                delivery.id
            },

            data: {
              status:
                input.status,

              ...(input.deliveryService
                !== undefined
                ? {
                    delivery_service:
                      input.deliveryService
                  }
                : {}),

              ...(input.trackingNumber
                !== undefined
                ? {
                    tracking_number:
                      input.trackingNumber
                  }
                : {}),

              ...(input.handedOverAt
                !== undefined
                ? {
                    handed_over_at:
                      input.handedOverAt
                  }
                : {}),

              ...(input.receivedAt
                !== undefined
                ? {
                    received_at:
                      input.receivedAt
                  }
                : {})
            },

            select: {
              id: true,
              order_id: true,
              status: true,
              delivery_service: true,
              tracking_number: true,
              handed_over_at: true,
              received_at: true,
              updated_at: true
            }
          });

      return {
        success: true,

        delivery: {
          id:
            updatedDelivery.id,

          orderId:
            updatedDelivery.order_id,

          status:
            updatedDelivery.status,

          deliveryService:
            updatedDelivery
              .delivery_service,

          trackingNumber:
            updatedDelivery
              .tracking_number,

          handedOverAt:
            updatedDelivery
              .handed_over_at,

          receivedAt:
            updatedDelivery
              .received_at,

          updatedAt:
            updatedDelivery.updated_at
        }
      };
    }
  );
}