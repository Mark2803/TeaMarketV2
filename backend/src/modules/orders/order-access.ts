import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { prisma } from "../../database/prisma.js";

function secret(): string {
  const value = process.env.GUEST_ORDER_ACCESS_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32 || value.startsWith("CHANGE_ME")) {
    throw new Error("GUEST_ORDER_ACCESS_SECRET_NOT_CONFIGURED");
  }
  return value;
}

export function issueOrderAccessToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`guest-order:v1:${orderId}`).digest("hex");
}

export async function authorizedOrder(req: Request, orderId: string, accessToken?: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const order = await prisma.orders.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (req.customer?.id && order.customer_id === req.customer.id) return order;
  if (!accessToken || !/^[0-9a-f]{64}$/.test(accessToken)) return null;
  const expected = Buffer.from(issueOrderAccessToken(orderId), "hex");
  const supplied = Buffer.from(accessToken, "hex");
  return timingSafeEqual(expected, supplied) ? order : null;
}
