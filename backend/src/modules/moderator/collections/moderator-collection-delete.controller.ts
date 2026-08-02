import type {
  Request,
  Response
} from "express";

import {
  moderatorCollectionParamsSchema
} from "./moderator-collection.schemas.js";

import {
  deleteModeratorCollection
} from "./moderator-collection-delete.service.js";

/**
 * Безопасно удаляет подборку.
 */
export async function deleteModeratorCollectionController(
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

  const result =
    await deleteModeratorCollection(
      paramsResult.data.collectionId
    );

  if (!result.success) {
    switch (result.error) {
      case "COLLECTION_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "COLLECTION_NOT_FOUND",

            message:
              "Подборка не найдена"
          }
        });

        return;

      case "COLLECTION_HAS_PRODUCTS":
        res.status(409).json({
          error: {
            code:
              "COLLECTION_HAS_PRODUCTS",

            message:
              "Нельзя удалить подборку, в которой есть товары"
          }
        });

        return;
    }
  }

  res.json({
    data: {
      collectionId:
        result.collectionId,

      deleted:
        true
    }
  });
}