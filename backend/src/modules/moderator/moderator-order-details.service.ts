import { prisma } from "../../database/prisma.js";

/**
 * Возвращает полную карточку заказа
 * для единого модератора.
 */
export async function getModeratorOrderByNumber(
  orderNumber: string
) {
  return prisma.orders.findUnique({
    where: {
      order_number:
        orderNumber
    },

    include: {
      customers: {
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          username: true,
          created_at: true
        }
      },

      order_items: {
        orderBy: {
          id:
            "asc"
        }
      },

      order_deliveries: {
        include: {
          delivery_methods:
            true
        }
      },

      order_payments: {
        include: {
          payment_methods:
            true
        },

        orderBy: {
          created_at:
            "asc"
        }
      },

      order_status_history: {
        orderBy: {
          changed_at:
            "asc"
        }
      }
    }
  });
}