import type {
  Request,
  Response
} from "express";

import {
  createOrderSchema,
  guestOrderTokenSchema
} from "./order.schemas.js";

import {
  createGuestOrder
} from "./order.service.js";

function getGuestToken(
  req: Request
) {
  const tokenHeader =
    req.headers["x-guest-token"];

  const token =
    Array.isArray(tokenHeader)
      ? tokenHeader[0]
      : tokenHeader;

  return guestOrderTokenSchema.safeParse(
    token
  );
}

function sendCreateOrderError(
  res: Response,
  result:
    | {
        success: false;
        error:
          "CART_NOT_FOUND"
          | "CART_EMPTY"
          | "DELIVERY_METHOD_NOT_FOUND"
          | "PAYMENT_METHOD_NOT_FOUND"
          | "PRODUCT_VARIANT_NOT_FOUND"
          | "INSUFFICIENT_STOCK";
        productVariantId?: string;
        availableQuantity?: number;
      }
) {
  switch (result.error) {
    case "CART_NOT_FOUND":
      res.status(404).json({
        error: {
          code:
            "CART_NOT_FOUND",

          message:
            "Активная корзина не найдена"
        }
      });

      return;

    case "CART_EMPTY":
      res.status(409).json({
        error: {
          code:
            "CART_EMPTY",

          message:
            "Нельзя оформить пустую корзину"
        }
      });

      return;

    case "DELIVERY_METHOD_NOT_FOUND":
      res.status(404).json({
        error: {
          code:
            "DELIVERY_METHOD_NOT_FOUND",

          message:
            "Способ доставки не найден или недоступен"
        }
      });

      return;

    case "PAYMENT_METHOD_NOT_FOUND":
      res.status(404).json({
        error: {
          code:
            "PAYMENT_METHOD_NOT_FOUND",

          message:
            "Способ оплаты не найден или недоступен"
        }
      });

      return;

    case "PRODUCT_VARIANT_NOT_FOUND":
      res.status(409).json({
        error: {
          code:
            "PRODUCT_VARIANT_NOT_FOUND",

          message:
            "Один из вариантов товара больше недоступен",

          details: {
            productVariantId:
              result.productVariantId
          }
        }
      });

      return;

    case "INSUFFICIENT_STOCK":
      res.status(409).json({
        error: {
          code:
            "INSUFFICIENT_STOCK",

          message:
            "Недостаточное количество товара в наличии",

          details: {
            productVariantId:
              result.productVariantId,

            availableQuantity:
              result.availableQuantity
          }
        }
      });
  }
}

export async function createOrderController(
  req: Request,
  res: Response
): Promise<void> {
  const tokenResult =
    getGuestToken(req);

  if (!tokenResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_GUEST_TOKEN",

        message:
          "Некорректный токен гостевой корзины",

        details:
          tokenResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    createOrderSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_ORDER_DATA",

        message:
          "Некорректные данные заказа",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
  await createGuestOrder(
    tokenResult.data,
    bodyResult.data,
    req.customer?.id
  );

  if (!result.success) {
    sendCreateOrderError(
      res,
      result
    );

    return;
  }

  res.status(201).json({
    data: result.order
  });
}