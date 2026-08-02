import type {
  Request,
  Response
} from "express";

import {
  moderatorOrderParamsSchema,
  updateOrderStatusSchema
} from "./moderator-order.schemas.js";

import {
  updateModeratorOrderStatus
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
      bodyResult.data.status
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

  res.json({
    data:
      result.order
  });
}