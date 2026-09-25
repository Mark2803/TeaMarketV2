import type { Request, Response } from "express";
import { prisma } from "../../../database/prisma.js";

function dates(req: Request) {
  const now = new Date();
  const to = req.query.to ? new Date(String(req.query.to) + "T23:59:59.999Z") : now;
  const from = req.query.from ? new Date(String(req.query.from) + "T00:00:00.000Z") : new Date(to.getTime() - 29 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("INVALID_PERIOD");
  return { from, to };
}

export async function getModeratorAnalyticsController(req: Request, res: Response): Promise<void> {
  let range;
  try { range = dates(req); } catch {
    res.status(400).json({ error: { code: "INVALID_PERIOD", message: "Некорректный период аналитики" } });
    return;
  }
  const { from, to } = range;

  const [sessions, events, orders, newCustomers, allOrderItems, discounts] = await Promise.all([
    prisma.analytics_sessions.findMany({
      where: { started_at: { gte: from, lte: to } },
      select: { id: true, visitor_id: true, source: true, medium: true, campaign: true, started_at: true }
    }),
    prisma.analytics_events.findMany({
      where: { created_at: { gte: from, lte: to } },
      select: { session_id: true, visitor_id: true, event_type: true, product_id: true, quantity: true, created_at: true }
    }),
    prisma.orders.findMany({
      where: { ordered_at: { gte: from, lte: to } },
      select: { id: true, customer_id: true, status: true, total_amount: true, discount_total: true, promo_code: true, loyalty_spent: true, ordered_at: true }
    }),
    prisma.customers.count({ where: { created_at: { gte: from, lte: to } } }),
    prisma.order_items.findMany({
      where: { orders: { ordered_at: { gte: from, lte: to }, status: { not: "cancelled" } } },
      select: { product_id: true, product_name: true, quantity: true, line_total: true }
    }),
    prisma.order_discounts.findMany({
      where: { orders: { ordered_at: { gte: from, lte: to }, status: { not: "cancelled" } } },
      select: { source_type: true, name: true, amount: true, order_id: true }
    })
  ]);

  const nonCancelled = orders.filter(o => o.status !== "cancelled");
  const completed = orders.filter(o => o.status === "completed");

  // "Выручка" в управленческой аналитике = сумма созданных и не отменённых заказов.
  // Фактический выкуп отдельно отражается показателем completed/buyout.
  const revenue = nonCancelled.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const averageCheck = nonCancelled.length ? revenue / nonCancelled.length : 0;
  const visitorCount = new Set(sessions.map(s => s.visitor_id)).size;
  const buyoutRate = nonCancelled.length ? completed.length / nonCancelled.length * 100 : 0;

  const attributionRows = orders.length
    ? await prisma.analytics_order_attributions.findMany({
        where: { order_id: { in: orders.map(o => o.id) } },
        select: {
          order_id: true,
          session_id: true,
          session: { select: { source: true, visitor_id: true, started_at: true } }
        }
      })
    : [];

  const attributionByOrder = new Map(attributionRows.map(a => [a.order_id, a]));
  const trackedNonCancelled = nonCancelled.filter(o => {
    const a = attributionByOrder.get(o.id);
    return !!a && a.session.started_at >= from && a.session.started_at <= to;
  });
  const trackedCompleted = completed.filter(o => {
    const a = attributionByOrder.get(o.id);
    return !!a && a.session.started_at >= from && a.session.started_at <= to;
  });
  const orderingVisitors = new Set(
    trackedNonCancelled.map(o => attributionByOrder.get(o.id)!.session.visitor_id)
  );
  const completedVisitors = new Set(
    trackedCompleted.map(o => attributionByOrder.get(o.id)!.session.visitor_id)
  );
  const orderConversion = visitorCount ? orderingVisitors.size / visitorCount * 100 : 0;

  const uniqueVisitorsFor = (type: string) =>
    new Set(events.filter(e => e.event_type === type).map(e => e.visitor_id)).size;

  const funnel = [
    { key: "visit", label: "Посетители", value: visitorCount },
    { key: "product", label: "Просмотр товара", value: uniqueVisitorsFor("product_view") },
    { key: "cart", label: "В корзину", value: uniqueVisitorsFor("add_to_cart") },
    { key: "checkout", label: "Оформление", value: uniqueVisitorsFor("checkout_started") },
    { key: "order", label: "Заказ", value: orderingVisitors.size },
    { key: "completed", label: "Выкуп", value: completedVisitors.size }
  ];

  const sources = new Map<string, {
    visitors: Set<string>;
    carts: Set<string>;
    orders: number;
    orderVisitors: Set<string>;
    revenue: number;
  }>();

  for (const s of sessions) {
    const x = sources.get(s.source) ?? { visitors: new Set(), carts: new Set(), orders: 0, orderVisitors: new Set(), revenue: 0 };
    x.visitors.add(s.visitor_id);
    sources.set(s.source, x);
  }

  const sessionSource = new Map(sessions.map(s => [s.id, s.source]));
  for (const e of events.filter(e => e.event_type === "add_to_cart")) {
    const src = sessionSource.get(e.session_id);
    if (src) {
      const x = sources.get(src);
      if (x) x.carts.add(e.session_id);
    }
  }

  // В источники конверсии попадают только заказы, реально связанные с сессией
  // выбранного периода. Старые заказы без аналитической атрибуции не создают 300%+.
  for (const o of trackedNonCancelled) {
    const a = attributionByOrder.get(o.id)!;
    const src = a.session.source;
    const x = sources.get(src) ?? { visitors: new Set(), carts: new Set(), orders: 0, orderVisitors: new Set(), revenue: 0 };
    x.orders++;
    x.orderVisitors.add(a.session.visitor_id);
    x.revenue += Number(o.total_amount);
    sources.set(src, x);
  }

  const sourceData = [...sources.entries()]
    .map(([source, x]) => ({
      source,
      visitors: x.visitors.size,
      cartSessions: x.carts.size,
      orders: x.orders,
      conversion: x.visitors.size ? x.orderVisitors.size / x.visitors.size * 100 : 0,
      revenue: x.revenue
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

  const productMap = new Map<string, { name: string; views: Set<string>; carts: Set<string>; sold: number; revenue: number }>();
  for (const e of events.filter(e => e.product_id)) {
    const id = e.product_id!;
    const x = productMap.get(id) ?? { name: "", views: new Set(), carts: new Set(), sold: 0, revenue: 0 };
    if (e.event_type === "product_view") x.views.add(e.visitor_id);
    if (e.event_type === "add_to_cart") x.carts.add(e.visitor_id);
    productMap.set(id, x);
  }
  for (const i of allOrderItems) {
    if (!i.product_id) continue;
    const x = productMap.get(i.product_id) ?? { name: i.product_name, views: new Set(), carts: new Set(), sold: 0, revenue: 0 };
    x.name = i.product_name;
    x.sold += i.quantity;
    x.revenue += Number(i.line_total);
    productMap.set(i.product_id, x);
  }
  const productIds = [...productMap.keys()];
  const productNames = productIds.length
    ? await prisma.products.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  for (const p of productNames) {
    const x = productMap.get(p.id);
    if (x) x.name = p.name;
  }
  const products = [...productMap.entries()]
    .map(([id, x]) => ({
      id,
      name: x.name || "Товар",
      views: x.views.size,
      cartSessions: x.carts.size,
      sold: x.sold,
      conversion: x.views.size ? x.carts.size / x.views.size * 100 : 0,
      revenue: x.revenue
    }))
    .sort((a, b) => b.revenue - a.revenue || b.sold - a.sold)
    .slice(0, 20);

  // Повторный покупатель: сделал заказ в периоде и уже имел более ранний
  // не отменённый заказ либо сделал больше одного заказа в самом периоде.
  const periodCustomerIds = [...new Set(nonCancelled.map(o => o.customer_id).filter((id): id is string => !!id))];
  const earlierCustomers = periodCustomerIds.length
    ? await prisma.orders.findMany({
        where: {
          customer_id: { in: periodCustomerIds },
          ordered_at: { lt: from },
          status: { not: "cancelled" }
        },
        distinct: ["customer_id"],
        select: { customer_id: true }
      })
    : [];
  const earlierSet = new Set(earlierCustomers.map(o => o.customer_id).filter((id): id is string => !!id));
  const customerOrderCounts = new Map<string, number>();
  for (const o of nonCancelled) {
    if (o.customer_id) customerOrderCounts.set(o.customer_id, (customerOrderCounts.get(o.customer_id) ?? 0) + 1);
  }
  const repeatCustomers = [...customerOrderCounts.entries()].filter(([id, count]) => count > 1 || earlierSet.has(id)).length;

  const promoOrders = new Set(nonCancelled.filter(o => o.promo_code).map(o => o.id)).size;
  const loyaltyOrders = new Set(nonCancelled.filter(o => Number(o.loyalty_spent) > 0).map(o => o.id)).size;
  const discountTotal = nonCancelled.reduce((sum, o) => sum + Number(o.discount_total), 0);
  const marketingRevenue = nonCancelled
    .filter(o => Number(o.discount_total) > 0)
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const days = new Map<string, { date: string; visitors: Set<string>; orders: number; revenue: number }>();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  for (const s of sessions) {
    const k = key(s.started_at);
    const x = days.get(k) ?? { date: k, visitors: new Set(), orders: 0, revenue: 0 };
    x.visitors.add(s.visitor_id);
    days.set(k, x);
  }
  for (const o of nonCancelled) {
    const k = key(o.ordered_at);
    const x = days.get(k) ?? { date: k, visitors: new Set(), orders: 0, revenue: 0 };
    x.orders++;
    x.revenue += Number(o.total_amount);
    days.set(k, x);
  }

  res.json({
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      overview: {
        visitors: visitorCount,
        orders: nonCancelled.length,
        revenue,
        averageCheck,
        orderConversion,
        buyoutRate
      },
      funnel,
      dynamics: [...days.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(x => ({ date: x.date, visitors: x.visitors.size, orders: x.orders, revenue: x.revenue })),
      sources: sourceData,
      products,
      customers: {
        newCustomers,
        repeatCustomers,
        repeatShare: customerOrderCounts.size ? repeatCustomers / customerOrderCounts.size * 100 : 0
      },
      marketing: {
        promoOrders,
        loyaltyOrders,
        discountTotal,
        marketingRevenue,
        discountEntries: discounts.length
      }
    }
  });
}
