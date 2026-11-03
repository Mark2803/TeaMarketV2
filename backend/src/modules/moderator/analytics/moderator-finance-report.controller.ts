import type { Request, Response } from "express";
import { prisma } from "../../../database/prisma.js";

// Detailed, administrator-only report. Dates filter orders by creation date;
// payments for those orders may have been recorded later (explicitly labelled).
export async function getModeratorFinanceReportController(req: Request, res: Response): Promise<void> {
  const fromText = String(req.query.from ?? "");
  const toText = String(req.query.to ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) {
    res.status(400).json({ error: { code: "INVALID_PERIOD", message: "Укажите даты YYYY-MM-DD" } });
    return;
  }
  const from = new Date(`${fromText}T00:00:00.000Z`);
  const to = new Date(`${toText}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to || to.getTime() - from.getTime() > 366 * 86400000) {
    res.status(400).json({ error: { code: "INVALID_PERIOD", message: "Некорректный период (максимум 366 дней)" } });
    return;
  }

  const orders = await prisma.orders.findMany({
    where: { ordered_at: { gte: from, lte: to } },
    orderBy: [{ ordered_at: "asc" }, { id: "asc" }],
    select: {
      id: true, order_number: true, ordered_at: true, status: true, payment_status: true,
      customer_name: true, items_total: true, gross_items_total: true, discount_total: true,
      loyalty_spent: true, delivery_cost: true, total_amount: true, promo_code: true
    }
  });
  const ids = orders.map(o => o.id);
  const [items, payments, discounts] = ids.length ? await Promise.all([
    prisma.order_items.findMany({ where: { order_id: { in: ids } }, select: {
      order_id: true, product_name: true, sku: true, quantity: true, weight_g: true,
      list_price: true, unit_price: true, discount_amount: true, line_total: true
    } }),
    prisma.order_payments.findMany({ where: { order_id: { in: ids } }, select: {
      order_id: true, operation_number: true, amount: true, status: true, paid_at: true, created_at: true
    } }),
    prisma.order_discounts.findMany({ where: { order_id: { in: ids } }, select: {
      order_id: true, source_type: true, code: true, name: true, amount: true, created_at: true
    } })
  ]) : [[], [], []];

  const numberById = new Map(orders.map(o => [o.id, o.order_number]));
  const amount = (v: { toString(): string } | null) => v === null ? null : Number(v);
  const date = (v: Date | null) => v ? v.toISOString() : null;
  const orderRows = orders.map(o => ({
    number: o.order_number, date: o.ordered_at.toISOString(), status: o.status,
    paymentStatus: o.payment_status, customer: o.customer_name,
    grossItems: amount(o.gross_items_total), items: amount(o.items_total),
    discount: amount(o.discount_total), loyalty: amount(o.loyalty_spent),
    delivery: amount(o.delivery_cost), total: amount(o.total_amount), promoCode: o.promo_code
  }));
  const itemRows = items.map(i => ({
    orderNumber: numberById.get(i.order_id) ?? "", product: i.product_name, sku: i.sku,
    quantity: i.quantity, weightG: amount(i.weight_g), listPrice: amount(i.list_price),
    unitPrice: amount(i.unit_price), discount: amount(i.discount_amount), total: amount(i.line_total)
  }));
  const paymentRows = payments.map(p => ({
    orderNumber: numberById.get(p.order_id) ?? "", operation: p.operation_number,
    amount: amount(p.amount), status: p.status, createdAt: p.created_at.toISOString(), paidAt: date(p.paid_at)
  }));
  const discountRows = discounts.map(d => ({
    orderNumber: numberById.get(d.order_id) ?? "", source: d.source_type, code: d.code,
    name: d.name, amount: amount(d.amount), createdAt: d.created_at.toISOString()
  }));
  const nonCancelled = orderRows.filter(o => o.status !== "cancelled");
  const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
  const daily = new Map<string, { date: string; orders: number; amount: number; cancelled: number }>();
  for (const o of orderRows) {
    const key = o.date.slice(0, 10);
    const row = daily.get(key) ?? { date: key, orders: 0, amount: 0, cancelled: 0 };
    if (o.status === "cancelled") row.cancelled++;
    else { row.orders++; row.amount += o.total ?? 0; }
    daily.set(key, row);
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ data: {
    period: { from: fromText, to: toText },
    definitions: {
      orders: "Заказы созданы в выбранный период (UTC); отменённые исключены из суммы заказов",
      payments: "Операции оплаты относятся к выбранным заказам, даже если операция проведена после периода",
      revenue: "Сумма неотменённых заказов — не фактически полученные деньги",
      refunds: "Отдельный реестр возвратов отсутствует в данном источнике; возвраты не рассчитаны",
      delivery: "Стоимость доставки, предъявленная покупателю, не расходы на услуги перевозчика"
    },
    totals: {
      orders: nonCancelled.length, cancelled: orderRows.length - nonCancelled.length,
      orderedAmount: sum(nonCancelled.map(o => o.total ?? 0)),
      deliveryCharged: sum(nonCancelled.map(o => o.delivery ?? 0)),
      discounts: sum(nonCancelled.map(o => o.discount ?? 0)),
      paymentOperations: paymentRows.length,
      // Do not conflate initiated payments with money received.
      paidAmount: sum(paymentRows.filter(p => p.status === "succeeded" || p.status === "paid").map(p => p.amount ?? 0))
    },
    orders: orderRows, items: itemRows, payments: paymentRows, discounts: discountRows,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ ...d, amount: Math.round(d.amount * 100) / 100 }))
  } });
}
