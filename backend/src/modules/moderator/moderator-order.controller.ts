import type {
  Request,
  Response
} from "express";

import {
  moderatorOrderParamsSchema,
  updateOrderStatusSchema,
  updateOrderArchiveSchema
} from "./moderator-order.schemas.js";

import { sendOrderStatusEmail } from "../notifications/notification.service.js";

import {
  updateModeratorOrderStatus,
  updateModeratorOrderArchive
} from "./moderator-order.service.js";

export async function updateModeratorOrderStatusController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorOrderParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_ORDER_NUMBER",

        message:
          "Некорректный номер заказа",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    updateOrderStatusSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_ORDER_STATUS",

        message:
          "Некорректный статус заказа",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorOrderStatus(
      paramsResult.data.orderNumber,
      bodyResult.data.status,
      bodyResult.data.cancellationReason
    );

  if (!result.success) {
    res.status(404).json({
      error: {
        code:
          "ORDER_NOT_FOUND",

        message:
          "Заказ не найден"
      }
    });

    return;
  }

  try {
    await sendOrderStatusEmail(result.order.orderNumber, result.order.status);
  } catch (error) {
    console.error("[NOTIFICATIONS] Не удалось отправить письмо о статусе заказа", error);
  }

  res.json({
    data:
      result.order
  });
}

export async function updateModeratorOrderArchiveController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorOrderParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code: "INVALID_ORDER_NUMBER",
        message: "Некорректный номер заказа",
        details: paramsResult.error.flatten()
      }
    });
    return;
  }

  const bodyResult =
    updateOrderArchiveSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code: "INVALID_ARCHIVE_STATE",
        message: "Некорректное состояние архива",
        details: bodyResult.error.flatten()
      }
    });
    return;
  }

  const result =
    await updateModeratorOrderArchive(
      paramsResult.data.orderNumber,
      bodyResult.data.archived
    );

  if (!result.success) {
    res.status(404).json({
      error: {
        code: "ORDER_NOT_FOUND",
        message: "Заказ не найден"
      }
    });
    return;
  }

  res.json({
    data:
      result.order
  });
}
