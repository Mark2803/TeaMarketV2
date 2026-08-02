import type {
  Request,
  Response
} from "express";

import {
  moderatorCollectionParamsSchema
} from "./moderator-collection.schemas.js";

import {
  getModeratorCollectionById
} from "./moderator-collection-details.service.js";

/**
 * Возвращает карточку подборки модератора.
 */
export async function getModeratorCollectionByIdController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorCollectionParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_COLLECTION_ID",

        message:
          "Некорректный ID подборки",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const collection =
    await getModeratorCollectionById(
      paramsResult.data.collectionId
    );

  if (!collection) {
    res.status(404).json({
      error: {
        code:
          "COLLECTION_NOT_FOUND",

        message:
          "Подборка не найдена"
      }
    });

    return;
  }

  res.json({
    data:
      collection
  });
}