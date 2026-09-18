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
/**
 * Единая точка расчёта доставки.
 * Сейчас использует тестовый базовый тариф из БД.
 * При подключении CDEK/Ozon/5Post здесь будет вызов API провайдера,
 * а контракт endpoint для checkout останется прежним.
 */
export async function calculateDeliveryQuote(
  deliveryMethodId: string,
  _fullAddress: string
) {
  const method = await prisma.delivery_methods.findFirst({
    where: { id: deliveryMethodId, is_active: true },
    select: { id: true, name: true, base_cost: true, delivery_term: true }
  });

  if (!method) return null;

  return {
    deliveryMethodId: method.id,
    deliveryMethodName: method.name,
    cost: method.base_cost,
    deliveryTerm: method.delivery_term,
    source: "test_base_cost" as const
  };
}
