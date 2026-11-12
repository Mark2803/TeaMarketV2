import type { Request, Response } from "express";

import {
  moderatorOrderParamsSchema,
  updateOrderStatusSchema,
  updateOrderArchiveSchema
} from "./moderator-order.schemas.js";

import { sendOrderStatusEmail } from "../notifications/notification.service.js";
import { refundAndCancelOrder } from "./moderator-refund.service.js";

import {
  updateModeratorOrderStatus,
  updateModeratorOrderArchive
} from "./moderator-order.service.js";

export async function updateModeratorOrderStatusController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult = moderatorOrderParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: {
      code: "INVALID_ORDER_NUMBER",
      message: "Некорректный номер заказа",
      details: paramsResult.error.flatten()
    }});
    return;
  }

  const bodyResult = updateOrderStatusSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: {
      code: "INVALID_ORDER_STATUS",
      message: "Некорректный статус заказа",
      details: bodyResult.error.flatten()
    }});
    return;
  }

  if (
    bodyResult.data.status !== "cancelled" ||
    !bodyResult.data.cancellationReason?.trim()
  ) {
    res.status(400).json({ error: {
      code: "MANUAL_STATUS_CHANGE_NOT_ALLOWED",
      message: "Вручную разрешена только отмена заказа с указанием причины"
    }});
    return;
  }

  if (bodyResult.data.status === "cancelled") {
    const current = await import("../../database/prisma.js").then(m => m.prisma.orders.findUnique({
      where: { order_number: paramsResult.data.orderNumber },
      select: { payment_status: true }
    }));
    if (current && (current.payment_status === "paid" || current.payment_status === "refunded")) {
      try {
        const refundResult = await refundAndCancelOrder(paramsResult.data.orderNumber, bodyResult.data.cancellationReason!);
        if (!refundResult.alreadyCancelled) {
          try { await sendOrderStatusEmail(paramsResult.data.orderNumber, "cancelled"); }
          catch (error) { console.error("[NOTIFICATIONS] Order cancellation email failed", error); }
        }
        res.json({ data: refundResult.order ?? { status: "cancelled" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "REFUND_FAILED";
        console.error("[YOOKASSA_REFUND]", message);
        res.status(409).json({ error: { code: "REFUND_FAILED", message } });
      }
      return;
    }
  }

  const result = await updateModeratorOrderStatus(
    paramsResult.data.orderNumber,
    bodyResult.data.status,
    bodyResult.data.cancellationReason
  );

  if (!result.success) {
    const errors = {
      ORDER_NOT_FOUND: { status: 404, message: "Заказ не найден" },
      INVALID_STATUS_TRANSITION: { status: 409, message: "Отмена заказа в текущем статусе невозможна" },
      PAID_ORDER_CANCELLATION_REQUIRES_REFUND: { status: 409, message: "Оплаченный заказ нельзя отменить без оформления возврата платежа" },
      ORDER_ITEM_VARIANT_NOT_FOUND: { status: 409, message: "Не удалось сопоставить позиции заказа с товарными остатками" }
    } as const;
    const error = errors[result.error];
    res.status(error.status).json({ error: { code: result.error, message: error.message } });
    return;
  }

  // A repeated cancellation is idempotent and must not send another notification.
  if (result.order.previousStatus !== result.order.status) {
    try {
      await sendOrderStatusEmail(result.order.orderNumber, result.order.status);
    } catch (error) {
      console.error("[NOTIFICATIONS] Не удалось отправить письмо о статусе заказа", error);
    }
  }

  res.json({ data: result.order });
}

export async function updateModeratorOrderArchiveController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult = moderatorOrderParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: {
      code: "INVALID_ORDER_NUMBER",
      message: "Некорректный номер заказа",
      details: paramsResult.error.flatten()
    }});
    return;
  }

  const bodyResult = updateOrderArchiveSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: {
      code: "INVALID_ARCHIVE_STATE",
      message: "Некорректное состояние архива",
      details: bodyResult.error.flatten()
    }});
    return;
  }

  const result = await updateModeratorOrderArchive(
    paramsResult.data.orderNumber,
    bodyResult.data.archived
  );
  if (!result.success) {
    res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Заказ не найден" } });
    return;
  }

  res.json({ data: result.order });
}
