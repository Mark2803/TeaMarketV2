import { prisma } from "../../database/prisma.js";

import type {
  UpdatePaymentInput
} from "./moderator-payment.schemas.js";

export type UpdateModeratorPaymentResult =
  | {
      success: true;
      payment: {
        id: string;
        orderId: string;
        status: string;
        orderPaymentStatus: string;
        operationNumber: string | null;
        paidAt: Date | null;
        updatedAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "ORDER_NOT_FOUND"
        | "PAYMENT_NOT_FOUND";
    };

/**
 * Преобразует статус платёжной операции
 * в общий статус оплаты заказа.
 */
function mapOrderPaymentStatus(
  paymentStatus:
    UpdatePaymentInput["status"]
) {
  switch (paymentStatus) {
    case "pending":
      return "pending";

    case "succeeded":
      return "paid";

    case "failed":
      return "failed";

    case "cancelled":
      return "unpaid";

    case "refunded":
      return "refunded";
  }
}

/**
 * Обновляет оплату заказа.
 */
export async function updateModeratorPayment(
  orderNumber: string,
  input: UpdatePaymentInput
): Promise<UpdateModeratorPaymentResult> {
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

      const payment =
        await transaction
          .order_payments
          .findFirst({
            where: {
              order_id:
                order.id
            },

            orderBy: {
              created_at:
                "desc"
            },

            select: {
              id: true
            }
          });

      if (!payment) {
        return {
          success: false,
          error:
            "PAYMENT_NOT_FOUND"
        };
      }

      const orderPaymentStatus =
        mapOrderPaymentStatus(
          input.status
        );

      const updatedPayment =
        await transaction
          .order_payments
          .update({
            where: {
              id:
                payment.id
            },

            data: {
              status:
                input.status,

              ...(input.operationNumber
                !== undefined
                ? {
                    operation_number:
                      input.operationNumber
                  }
                : {}),

              ...(input.paidAt
                !== undefined
                ? {
                    paid_at:
                      input.paidAt
                  }
                : {})
            },

            select: {
              id: true,
              order_id: true,
              status: true,
              operation_number: true,
              paid_at: true,
              updated_at: true
            }
          });

      await transaction.orders.update({
        where: {
          id:
            order.id
        },

        data: {
          payment_status:
            orderPaymentStatus
        }
      });

      return {
        success: true,

        payment: {
          id:
            updatedPayment.id,

          orderId:
            updatedPayment.order_id,

          status:
            updatedPayment.status,

          orderPaymentStatus,

          operationNumber:
            updatedPayment
              .operation_number,

          paidAt:
            updatedPayment.paid_at,

          updatedAt:
            updatedPayment.updated_at
        }
      };
    }
  );
}