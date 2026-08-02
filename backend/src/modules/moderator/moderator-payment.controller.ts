import type {
  Request,
  Response
} from "express";

import {
  moderatorOrderParamsSchema
} from "./moderator-order.schemas.js";

import {
  updatePaymentSchema
} from "./moderator-payment.schemas.js";

import {
  updateModeratorPayment
} from "./moderator-payment.service.js";

export async function updateModeratorPaymentController(
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
    updatePaymentSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PAYMENT_DATA",

        message:
          "Некорректные данные оплаты",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorPayment(
      paramsResult.data.orderNumber,
      bodyResult.data
    );

  if (!result.success) {
    const message =
      result.error ===
      "ORDER_NOT_FOUND"
        ? "Заказ не найден"
        : "Платёж заказа не найден";

    res.status(404).json({
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
      result.payment
  });
}