import { prisma } from "../../database/prisma.js";
import { updateModeratorOrderStatus } from "../moderator/moderator-order.service.js";
import { sendOrderStatusEmail } from "../notifications/notification.service.js";
import { getYooKassaPaymentStatus, synchronizeYooKassaPayment } from "./yookassa.service.js";

/**
 * Автоотмена неоплаченных заказов.
 *
 * Неоплаченный заказ держит товар (остаток уменьшается при оформлении),
 * использование промокода и списанные бонусы. Через UNPAID_ORDER_TTL_HOURS
 * (по умолчанию 24 часа) такой заказ отменяется: товар, промокод и бонусы
 * возвращаются, покупателю уходит письмо.
 *
 * Деньги покупателя важнее: заказ НЕ отменяется, пока у ЮKassa есть
 * незавершённый платёж (покупатель ещё может оплатить). Если платёж уже прошёл,
 * а уведомление потерялось — заказ отмечается оплаченным, а не отменяется.
 */

const DEFAULT_TTL_HOURS = 24;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const BATCH_SIZE = 50;

function ttlHours(): number {
  const value = Number(process.env.UNPAID_ORDER_TTL_HOURS);
  return Number.isFinite(value) && value >= 1 ? value : DEFAULT_TTL_HOURS;
}

/** true — у ЮKassa нет живого платежа и заказ можно отменять. */
async function noLivePayment(operationNumbers: string[]): Promise<boolean> {
  for (const paymentId of operationNumbers) {
    const status = await getYooKassaPaymentStatus(paymentId);
    if (status === "succeeded") {
      // Оплата прошла, но уведомление не дошло: доводим заказ до «оплачен».
      await synchronizeYooKassaPayment(paymentId);
      return false;
    }
    if (status !== "canceled") return false;
  }
  return true;
}

export async function expireUnpaidOrders(): Promise<void> {
  const hours = ttlHours();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const orders = await prisma.orders.findMany({
    where: { status: "new", payment_status: "unpaid", ordered_at: { lt: cutoff } },
    orderBy: { ordered_at: "asc" },
    take: BATCH_SIZE,
    select: {
      order_number: true,
      order_payments: { select: { operation_number: true } }
    }
  });

  for (const order of orders) {
    try {
      const operationNumbers = order.order_payments
        .map((payment) => payment.operation_number)
        .filter((value): value is string => Boolean(value));
      if (!(await noLivePayment(operationNumbers))) continue;

      // Внутри — блокировка заказа и повторная проверка, что он всё ещё не оплачен.
      const result = await updateModeratorOrderStatus(
        order.order_number,
        "cancelled",
        `Автоотмена: заказ не оплачен в течение ${hours} ч.`
      );
      if (!result.success || result.order.previousStatus === "cancelled") continue;

      console.info("UNPAID_ORDER_EXPIRED", order.order_number);
      try {
        await sendOrderStatusEmail(order.order_number, "cancelled");
      } catch (error) {
        console.error("UNPAID_ORDER_EMAIL_FAILED", order.order_number, error);
      }
    } catch (error) {
      // ЮKassa недоступна или другой сбой — попробуем при следующей проверке.
      console.warn("UNPAID_ORDER_EXPIRATION_SKIPPED", order.order_number, error instanceof Error ? error.message : error);
    }
  }
}

let running = false;

/** Проверка раз в 15 минут; первая — через минуту после запуска сервера. */
export function startUnpaidOrderExpiration(): void {
  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await expireUnpaidOrders();
    } catch (error) {
      console.error("UNPAID_ORDER_EXPIRATION_FAILED", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  setTimeout(() => { void run(); }, 60_000).unref();
  setInterval(() => { void run(); }, CHECK_INTERVAL_MS).unref();
}
