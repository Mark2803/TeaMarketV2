import type {
  Request,
  Response
} from "express";

import {
  moderatorCategoryParamsSchema
} from "./moderator-category.schemas.js";

import {
  getModeratorCategoryById
} from "./moderator-category-details.service.js";

/**
 * Возвращает карточку категории модератора.
 */
export async function getModeratorCategoryByIdController(
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

  const category =
    await getModeratorCategoryById(
      paramsResult.data.categoryId
    );

  if (!category) {
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
      category
  });
}