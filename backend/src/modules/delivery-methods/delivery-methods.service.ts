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
// Ozon tariff must come from Ozon API, not from the old demo DB base_cost.
// Until the integration is activated, quote is deliberately unavailable.
export async function calculateDeliveryQuote(
  deliveryMethodId: string,
  fullAddress: string
) {
  if (!fullAddress.trim()) {
    return null;
  }

  const method = await prisma.delivery_methods.findFirst({
    where: {
      id: deliveryMethodId,
      is_active: true
    },
    select: {
      id: true,
      name: true,
      base_cost: true,
      delivery_term: true
    }
  });

  if (!method) {
    return null;
  }

  return {
    deliveryMethodId: method.id,
    deliveryMethodName: method.name,
    cost: method.base_cost,
    deliveryTerm: method.delivery_term
  };
}