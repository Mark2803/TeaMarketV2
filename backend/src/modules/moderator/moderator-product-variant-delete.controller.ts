import type {
  Request,
  Response
} from "express";

import {
  moderatorVariantParamsSchema
} from "./moderator-product.schemas.js";

import {
  deleteModeratorProductVariant
} from "./moderator-product-variant-delete.service.js";

export async function deleteModeratorProductVariantController(
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

  const result =
    await deleteModeratorProductVariant(
      paramsResult.data.productId,
      paramsResult.data.variantId
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

      case "VARIANT_IN_USE":
        res.status(409).json({
          error: {
            code:
              "VARIANT_IN_USE",

            message:
              "Вариант использовался в корзинах и не может быть удалён. Используйте архивирование."
          }
        });

        return;
    }
  }

  res.json({
    data: {
      variantId:
        result.variantId,

      deleted:
        true
    }
  });
}