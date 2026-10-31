import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { authorizedOrder } from "./order-access.js";
import { initiateYooKassaPayment, synchronizeYooKassaPayment } from "./yookassa.service.js";

function token(req: Request): string | undefined {
  const value = req.headers["x-order-access-token"];
  return typeof value === "string" ? value : undefined;
}

async function load(req: Request, res: Response) {
  const id = req.params.orderId;
  const order = await authorizedOrder(req, typeof id === "string" ? id : "", token(req));
  if (!order) res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Заказ не найден" } });
  return order;
}

export async function getAccessibleOrder(req: Request, res: Response) {
  const order = await load(req, res);
  if (!order) return;
  const lastPayment = await prisma.order_payments.findFirst({ where: { order_id: order.id, operation_number: { not: null } }, orderBy: { created_at: "desc" } });
  if (lastPayment?.operation_number && order.payment_status !== "paid") {
    try { await synchronizeYooKassaPayment(lastPayment.operation_number); }
    catch (error) { console.error("YooKassa payment status refresh failed", error); }
  }
  const data = await prisma.orders.findUnique({
    where: { id: order.id },
    select: { id: true, order_number: true, status: true, payment_status: true,
      total_amount: true, items_total: true, delivery_cost: true, ordered_at: true,
      order_items: { select: { id: true, product_name: true, quantity: true, line_total: true, weight_g: true } }
    }
  });
  res.json({ data });
}

export async function payAccessibleOrder(req: Request, res: Response) {
  const order = await load(req, res);
  if (!order) return;
  if (order.status === "cancelled") { res.status(409).json({ error: { message: "Заказ отменён" } }); return; }
  if (order.payment_status === "paid") { res.status(409).json({ error: { message: "Заказ уже оплачен" } }); return; }
  const origin = process.env.STOREFRONT_URL || "http://localhost:5173";
  const access = token(req);
  const returnUrl = `${origin.replace(/\/$/, "")}/order/${order.id}${access ? `?access=${encodeURIComponent(access)}` : ""}`;
  try {
    const confirmationUrl = await initiateYooKassaPayment(order.id, returnUrl);
    if (!confirmationUrl) { res.status(409).json({ error: { message: "Заказ уже оплачен или ЮKassa не настроена" } }); return; }
    res.json({ data: { confirmationUrl } });
  } catch (error) {
    console.error("YooKassa retry payment failed", error);
    res.status(502).json({ error: { message: "Не удалось открыть оплату. Повторите попытку позже." } });
  }
}
