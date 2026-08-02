import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  ModeratorOrdersQuery
} from "./moderator-orders.query.js";

/**
 * Возвращает список всех заказов для модератора.
 */
export async function getModeratorOrders(
  query: ModeratorOrdersQuery
) {
  const skip =
    (query.page - 1)
    * query.limit;

  const where:
  Prisma.ordersWhereInput = {};

  if (query.status) {
    where.status =
      query.status;
  }

  if (query.search) {
    where.OR = [
      {
        order_number: {
          contains:
            query.search,

          mode:
            "insensitive"
        }
      },

      {
        customer_name: {
          contains:
            query.search,

          mode:
            "insensitive"
        }
      },

      {
        phone: {
          contains:
            query.search
        }
      },

      {
        email: {
          contains:
            query.search,

          mode:
            "insensitive"
        }
      }
    ];
  }

  const [items, total] =
    await prisma.$transaction([
      prisma.orders.findMany({
        where,

        skip,
        take:
          query.limit,

        orderBy: {
          ordered_at:
            "desc"
        },

        select: {
          id: true,
          order_number: true,
          customer_id: true,
          customer_name: true,
          phone: true,
          email: true,
          status: true,
          payment_status: true,
          items_total: true,
          delivery_cost: true,
          total_amount: true,
          ordered_at: true,
          updated_at: true,

          order_items: {
            select: {
              id: true,
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
      }),

      prisma.orders.count({
        where
      })
    ]);

  return {
    items,

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        Math.ceil(
          total
          / query.limit
        )
    }
  };
}