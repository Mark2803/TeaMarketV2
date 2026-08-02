import type {
  Request,
  Response
} from "express";

import {
  updateDeliverySchema
} from "./moderator-delivery.schemas.js";

import {
  moderatorOrderParamsSchema
} from "./moderator-order.schemas.js";

import {
  updateModeratorDelivery
} from "./moderator-delivery.service.js";

export async function updateModeratorDeliveryController(
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
    updateDeliverySchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_DELIVERY_DATA",

        message:
          "Некорректные данные доставки",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorDelivery(
      paramsResult.data.orderNumber,
      bodyResult.data
    );

  if (!result.success) {
    const statusCode =
      result.error ===
      "ORDER_NOT_FOUND"
        ? 404
        : 404;

    const message =
      result.error ===
      "ORDER_NOT_FOUND"
        ? "Заказ не найден"
        : "Доставка заказа не найдена";

    res.status(statusCode).json({
      error: {
        code:
          result.error,

        message
      }
    });

    return;
  }

  res.json({
    data:
      result.delivery
  });
}