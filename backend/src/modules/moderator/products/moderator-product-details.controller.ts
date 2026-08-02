import type {
  Request,
  Response
} from "express";

import {
  moderatorProductParamsSchema
} from "../moderator-product.schemas.js";

import {
  getModeratorProductById
} from "./moderator-product-details.service.js";

/**
 * Возвращает полную карточку товара модератора.
 */
export async function getModeratorProductByIdController(
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

  const product =
    await getModeratorProductById(
      paramsResult.data.productId
    );

  if (!product) {
    res.status(404).json({
      error: {
        code:
          "PRODUCT_NOT_FOUND",

        message:
          "Товар не найден"
      }
    });

    return;
  }

  res.json({
    data:
      product
  });
}
