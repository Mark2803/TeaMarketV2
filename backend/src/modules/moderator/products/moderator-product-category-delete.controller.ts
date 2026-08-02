import type {
  Request,
  Response
} from "express";

import {
  moderatorProductCategoryParamsSchema
} from "./moderator-product-category.schemas.js";

import {
  deleteModeratorProductCategory
} from "./moderator-product-category-delete.service.js";

export async function deleteModeratorProductCategoryController(
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

  const result =
    await deleteModeratorProductCategory(
      paramsResult.data.productId,
      paramsResult.data.categoryId
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

      case "CATEGORY_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "CATEGORY_NOT_FOUND",

            message:
              "Категория не найдена"
          }
        });

        return;

      case "PRODUCT_CATEGORY_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PRODUCT_CATEGORY_NOT_FOUND",

            message:
              "Категория не привязана к товару"
          }
        });

        return;
    }
  }

  res.json({
    data: {
      productId:
        result.productId,

      categoryId:
        result.categoryId,

      deleted:
        true
    }
  });
}