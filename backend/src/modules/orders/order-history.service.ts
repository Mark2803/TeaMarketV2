import { prisma } from "../../database/prisma.js";

/**
 * Возвращает историю заказов покупателя.
 */
export async function getCustomerOrders(
  customerId: string
) {
  return prisma.orders.findMany({
    where: {
      customer_id:
        customerId
    },

    orderBy: {
      ordered_at:
        "desc"
    },

    select: {
      id: true,
      order_number: true,
      status: true,
      payment_status: true,
      items_total: true,
      delivery_cost: true,
      total_amount: true,
      ordered_at: true,

      order_items: {
        orderBy: {
          id:
            "asc"
        },

        select: {
          id: true,
          product_id: true,
          product_name: true,
          sku: true,
          weight_g: true,
          unit_price: true,
          quantity: true,
          line_total: true
        }
      },

      order_deliveries: {
        select: {
          status: true,
          tracking_number: true,
          delivery_service: true,

          delivery_methods: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });
}

/**
 * Возвращает один заказ покупателя по номеру.
 */
export async function getCustomerOrderByNumber(
  customerId: string,
  orderNumber: string
) {
  return prisma.orders.findFirst({
    where: {
      customer_id:
        customerId,

      order_number:
        orderNumber
    },

    include: {
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