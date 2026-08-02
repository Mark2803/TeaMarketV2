import type {
  Request,
  Response
} from "express";

import {
  createModeratorCollectionSchema
} from "./moderator-collection.schemas.js";

import {
  createModeratorCollection
} from "./moderator-collection-create.service.js";

/**
 * Создаёт подборку товаров.
 */
export async function createModeratorCollectionController(
  req: Request,
  res: Response
): Promise<void> {
  const bodyResult =
    createModeratorCollectionSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_COLLECTION_DATA",

        message:
          "Некорректные данные подборки",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await createModeratorCollection(
      bodyResult.data
    );

  if (!result.success) {
    res.status(409).json({
      error: {
        code:
          "COLLECTION_SLUG_ALREADY_EXISTS",

        message:
          "Подборка с таким slug уже существует"
      }
    });

    return;
  }

  res.status(201).json({
    data:
      result.collection
  });
}