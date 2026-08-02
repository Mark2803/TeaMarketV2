import type {
  Request,
  Response
} from "express";

import {
  moderatorProductParamsSchema,
  updateModeratorProductSchema
} from "./moderator-product.schemas.js";

import {
  updateModeratorProduct
} from "./moderator-product-update.service.js";

export async function updateModeratorProductController(
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

  const bodyResult =
    updateModeratorProductSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_DATA",

        message:
          "Некорректные данные товара",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorProduct(
      paramsResult.data.productId,
      bodyResult.data
    );

  if (!result.success) {
    if (
      result.error ===
      "PRODUCT_NOT_FOUND"
    ) {
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

    res.status(409).json({
      error: {
        code:
          "PRODUCT_SLUG_ALREADY_EXISTS",

        message:
          "Товар с таким slug уже существует"
      }
    });

    return;
  }

  res.json({
    data:
      result.product
  });
}