import type {
  Request,
  Response
} from "express";

import {
  createModeratorProductVariantSchema,
  moderatorProductParamsSchema
} from "./moderator-product.schemas.js";

import {
  createModeratorProductVariant
} from "./moderator-product-variant-create.service.js";

export async function createModeratorProductVariantController(
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
    createModeratorProductVariantSchema.safeParse(
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
    await createModeratorProductVariant(
      paramsResult.data.productId,
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
    }
  }

  res.status(201).json({
    data:
      result.variant
  });
}