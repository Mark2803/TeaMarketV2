import { prisma } from "../../database/prisma.js";

/**
 * Возвращает доступные покупателю способы доставки.
 */
export async function getActiveDeliveryMethods() {
  return prisma.delivery_methods.findMany({
    where: {
      is_active: true
    },

    orderBy: [
      {
        sort_order: "asc"
      },
      {
        name: "asc"
      }
    ],

    select: {
      id: true,
      name: true,
      base_cost: true,
      delivery_term: true
    }
  });
}