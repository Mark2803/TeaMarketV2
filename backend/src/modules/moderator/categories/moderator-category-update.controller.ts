import type {
  Request,
  Response
} from "express";

import {
  moderatorCategoryParamsSchema,
  updateModeratorCategorySchema
} from "./moderator-category.schemas.js";

import {
  updateModeratorCategory
} from "./moderator-category-update.service.js";

/**
 * Обновляет категорию каталога.
 */
export async function updateModeratorCategoryController(
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

  const bodyResult =
    updateModeratorCategorySchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_CATEGORY_DATA",

        message:
          "Некорректные данные категории",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorCategory(
      paramsResult.data.categoryId,
      bodyResult.data
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

      case "PARENT_CATEGORY_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PARENT_CATEGORY_NOT_FOUND",

            message:
              "Родительская категория не найдена"
          }
        });

        return;

      case "CATEGORY_SLUG_ALREADY_EXISTS":
        res.status(409).json({
          error: {
            code:
              "CATEGORY_SLUG_ALREADY_EXISTS",

            message:
              "Категория с таким slug уже существует"
          }
        });

        return;

      case "CATEGORY_CANNOT_BE_OWN_PARENT":
        res.status(400).json({
          error: {
            code:
              "CATEGORY_CANNOT_BE_OWN_PARENT",

            message:
              "Категория не может быть родительской для самой себя"
          }
        });

        return;
    }
  }

  res.json({
    data:
      result.category
  });
}