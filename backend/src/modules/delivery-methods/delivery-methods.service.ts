import { prisma } from "../../database/prisma.js";

/**
 * Магазин работает только с Яндекс Доставкой. Доставка в ПВЗ и до двери —
 * режимы одного способа «Яндекс Доставка», стоимость считает API Яндекса.
 */
export function isYandexDeliveryMethod(name: string): boolean {
  return /яндекс|yandex/i.test(name);
}

/** Возвращает доступные покупателю способы доставки (только Яндекс Доставка). */
export async function getActiveDeliveryMethods() {
  const methods = await prisma.delivery_methods.findMany({
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

  return methods.filter((method) => isYandexDeliveryMethod(method.name));
}
