import type {
  Request,
  Response
} from "express";

import {
  moderatorCategoryParamsSchema
} from "./moderator-category.schemas.js";

import {
  deleteModeratorCategory
} from "./moderator-category-delete.service.js";

/**
 * Безопасно удаляет категорию.
 */
export async function deleteModeratorCategoryController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorCategoryParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_CATEGORY_ID",

        message:
          "Некорректный ID категории",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await deleteModeratorCategory(
      paramsResult.data.categoryId
    );

  if (!result.success) {
    switch (result.error) {
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

      case "CATEGORY_HAS_CHILDREN":
        res.status(409).json({
          error: {
            code:
              "CATEGORY_HAS_CHILDREN",

            message:
              "Нельзя удалить категорию, у которой есть дочерние категории"
          }
        });

        return;

      case "CATEGORY_HAS_PRODUCTS":
        res.status(409).json({
          error: {
            code:
              "CATEGORY_HAS_PRODUCTS",

            message:
              "Нельзя удалить категорию, к которой привязаны товары"
          }
        });

        return;
    }
  }

  res.json({
    data: {
      categoryId:
        result.categoryId,

      deleted:
        true
    }
  });
}