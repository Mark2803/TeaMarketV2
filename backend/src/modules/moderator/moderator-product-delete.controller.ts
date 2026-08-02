import type {
  Request,
  Response
} from "express";

import {
  moderatorProductParamsSchema
} from "./moderator-product.schemas.js";

import {
  deleteModeratorProduct
} from "./moderator-product-delete.service.js";

/**
 * Удаляет товар.
 */
export async function deleteModeratorProductController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorProductParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_ID",

        message:
          "Некорректный ID товара",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await deleteModeratorProduct(
      paramsResult.data.productId
    );

  if (!result.success) {
    switch (result.error) {
      case "PRODUCT_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PRODUCT_NOT_FOUND",

            message:
              "Товар не найден"
          }
        });

        return;

      case "PRODUCT_IN_ORDERS":
        res.status(409).json({
          error: {
            code:
              "PRODUCT_IN_ORDERS",

            message:
              "Товар использовался в заказах и не может быть удалён. Используйте деактивацию."
          }
        });

        return;

      case "PRODUCT_IN_CARTS":
        res.status(409).json({
          error: {
            code:
              "PRODUCT_IN_CARTS",

            message:
              "Варианты товара используются в корзинах и не могут быть удалены."
          }
        });

        return;
    }
  }

  res.json({
    data: {
      productId:
        result.productId,

      deleted:
        true
    }
  });
}