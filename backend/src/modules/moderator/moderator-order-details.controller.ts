import type {
  Request,
  Response
} from "express";

import {
  moderatorOrderParamsSchema
} from "./moderator-order.schemas.js";

import {
  getModeratorOrderByNumber
} from "./moderator-order-details.service.js";

/**
 * Возвращает полную карточку заказа
 * для модератора.
 */
export async function getModeratorOrderController(
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

  const order =
    await getModeratorOrderByNumber(
      paramsResult.data.orderNumber
    );

  if (!order) {
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
      order
  });
}