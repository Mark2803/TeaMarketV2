import { prisma } from "../../database/prisma.js";

/**
 * Возвращает доступные покупателю способы оплаты.
 *
 * Сейчас используется локальный справочник.
 * Интеграция с ЮKassa будет добавлена позднее.
 */
export async function getActivePaymentMethods() {
  return prisma.payment_methods.findMany({
    where: {
      is_active: true
    },

    orderBy: {
      name: "asc"
    },

    select: {
      id: true,
      name: true
    }
  });
}