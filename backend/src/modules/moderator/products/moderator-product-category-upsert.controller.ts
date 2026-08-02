import type {
  Request,
  Response
} from "express";

import {
  moderatorProductCategoryParamsSchema,
  upsertModeratorProductCategorySchema
} from "./moderator-product-category.schemas.js";

import {
  upsertModeratorProductCategory
} from "./moderator-product-category-upsert.service.js";

export async function upsertModeratorProductCategoryController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorProductCategoryParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_CATEGORY_ID",

        message:
          "Некорректный ID товара или категории",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    upsertModeratorProductCategorySchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_CATEGORY_DATA",

        message:
          "Некорректные данные категории товара",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await upsertModeratorProductCategory(
      paramsResult.data.productId,
      paramsResult.data.categoryId,
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

    res.status(404).json({
      error: {
        code:
          "CATEGORY_NOT_FOUND",

        message:
          "Категория не найдена"
      }
    });

    return;
  }

  res.json({
    data:
      result.productCategory
  });
}