import { prisma } from "../../database/prisma.js";
import type { OzonPaymentStore } from "./ozon-status-workflow.js";
import type { LocalPaymentState, PaymentSnapshot } from "./ozon-payment-reconciliation.js";

type LinkRow = { ext_id: string; ozon_order_id: string; state: string };
const states = new Set<LocalPaymentState>(["pending", "authorized", "paid", "canceled", "refunded", "disputed"]);

/** Requires backend/sql/ozon_payment_links.sql. No client-controlled status updates. */
export const ozonPostgresPaymentStore: OzonPaymentStore = {
  async getByOrderNumber(orderNumber): Promise<PaymentSnapshot | null> {
    const rows = await prisma.$queryRaw<LinkRow[]>`
      SELECT l.ext_id, l.ozon_order_id, l.state
      FROM ozon_payment_links l JOIN orders o ON o.id = l.order_id
      WHERE l.ext_id = ${orderNumber} AND o.order_number = ${orderNumber}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !states.has(row.state as LocalPaymentState)) return null;
    return { orderNumber: row.ext_id, ozonOrderId: row.ozon_order_id, state: row.state as LocalPaymentState };
  },
  async compareAndSetState({ orderNumber, ozonOrderId, expectedState, nextState }) {
    return prisma.$transaction(async (tx) => {
      const changed = await tx.$queryRaw<{ order_id: string }[]>`
        UPDATE ozon_payment_links AS l SET state = ${nextState}, updated_at = NOW()
        FROM orders AS o
        WHERE l.order_id = o.id AND o.order_number = ${orderNumber}
          AND l.ext_id = ${orderNumber} AND l.ozon_order_id = ${ozonOrderId}
          AND l.state = ${expectedState}
        RETURNING l.order_id
      `;
      const changedRow = changed[0];
      if (changed.length !== 1 || !changedRow) return false;
      // Only a trusted verified paid transition can mark the order paid.
      if (nextState === "paid") {
        await tx.$executeRaw`
          UPDATE orders SET payment_status = 'paid', updated_at = NOW()
          WHERE id = ${changedRow.order_id}::uuid AND payment_status <> 'paid'
        `;
      }
      return true;
    });
  }
};

/** Call only after successful server-to-server Ozon order creation.
 * Idempotent for the same identifiers; refuses replacement of an existing link.
 */
export async function linkVerifiedOzonOrder(orderNumber: string, ozonOrderId: string): Promise<boolean> {
  const inserted = await prisma.$queryRaw<{ order_id: string }[]>`
    INSERT INTO ozon_payment_links (order_id, ext_id, ozon_order_id)
    SELECT id, order_number, ${ozonOrderId} FROM orders
    WHERE order_number = ${orderNumber}
    ON CONFLICT DO NOTHING RETURNING order_id
  `;
  if (inserted.length === 1) return true;
  const existing = await ozonPostgresPaymentStore.getByOrderNumber(orderNumber);
  return existing?.ozonOrderId === ozonOrderId;
}
