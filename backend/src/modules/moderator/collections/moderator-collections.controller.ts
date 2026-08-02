import type {
  Request,
  Response
} from "express";

import {
  moderatorCollectionsQuerySchema
} from "./moderator-collections.query.js";

import {
  getModeratorCollections
} from "./moderator-collections.service.js";

/**
 * Возвращает список подборок модератора.
 */
export async function getModeratorCollectionsController(
  req: Request,
  res: Response
): Promise<void> {
  const queryResult =
    moderatorCollectionsQuerySchema.safeParse(
      req.query
    );

  if (!queryResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_MODERATOR_COLLECTIONS_QUERY",

        message:
          "Некорректные параметры списка подборок",

        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getModeratorCollections(
      queryResult.data
    );

  res.json({
    data:
      result.items,

    pagination:
      result.pagination
  });
}