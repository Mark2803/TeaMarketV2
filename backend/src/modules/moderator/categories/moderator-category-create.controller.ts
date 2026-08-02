import type {
  Request,
  Response
} from "express";

import {
  createModeratorCategorySchema
} from "./moderator-category.schemas.js";

import {
  createModeratorCategory
} from "./moderator-category-create.service.js";

/**
 * Создаёт категорию каталога.
 */
export async function createModeratorCategoryController(
  req: Request,
  res: Response
): Promise<void> {
  const bodyResult =
    createModeratorCategorySchema.safeParse(
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
    await createModeratorCategory(
      bodyResult.data
    );

  if (!result.success) {
    switch (result.error) {
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
    }
  }

  res.status(201).json({
    data:
      result.category
  });
}