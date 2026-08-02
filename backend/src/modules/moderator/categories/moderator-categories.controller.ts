import type {
  Request,
  Response
} from "express";

import {
  moderatorCategoriesQuerySchema
} from "./moderator-categories.query.js";

import {
  getModeratorCategories
} from "./moderator-categories.service.js";

/**
 * Возвращает список категорий модератора.
 */
export async function getModeratorCategoriesController(
  req: Request,
  res: Response
): Promise<void> {
  const queryResult =
    moderatorCategoriesQuerySchema.safeParse(
      req.query
    );

  if (!queryResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_MODERATOR_CATEGORIES_QUERY",

        message:
          "Некорректные параметры списка категорий",

        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getModeratorCategories(
      queryResult.data
    );

  res.json({
    data:
      result.items,

    pagination:
      result.pagination
  });
}