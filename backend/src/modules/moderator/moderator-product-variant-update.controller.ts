import type {
  Request,
  Response
} from "express";

import {
  moderatorVariantParamsSchema,
  updateModeratorProductVariantSchema
} from "./moderator-product.schemas.js";

import {
  updateModeratorProductVariant
} from "./moderator-product-variant-update.service.js";

export async function updateModeratorProductVariantController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorVariantParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_VARIANT_ID",

        message:
          "Некорректный ID товара или варианта",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    updateModeratorProductVariantSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_VARIANT_DATA",

        message:
          "Некорректные данные варианта товара",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorProductVariant(
      paramsResult.data.productId,
      paramsResult.data.variantId,
      bodyResult.data
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

      case "VARIANT_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "VARIANT_NOT_FOUND",

            message:
              "Вариант товара не найден"
          }
        });

        return;

      case "VARIANT_SKU_ALREADY_EXISTS":
        res.status(409).json({
          error: {
            code:
              "VARIANT_SKU_ALREADY_EXISTS",

            message:
              "Вариант с таким SKU уже существует"
          }
        });

        return;

      case "VARIANT_WEIGHT_ALREADY_EXISTS":
        res.status(409).json({
          error: {
            code:
              "VARIANT_WEIGHT_ALREADY_EXISTS",

            message:
              "У товара уже есть вариант с таким весом"
          }
        });

        return;

      case "INVALID_OLD_PRICE":
        res.status(400).json({
          error: {
            code:
              "INVALID_OLD_PRICE",

            message:
              "Старая цена должна быть больше текущей"
          }
        });

        return;
    }
  }

  res.json({
    data:
      result.variant
  });
}