import type {
  Request,
  Response
} from "express";

import {
  moderatorCollectionParamsSchema,
  updateModeratorCollectionSchema
} from "./moderator-collection.schemas.js";

import {
  updateModeratorCollection
} from "./moderator-collection-update.service.js";

/**
 * Обновляет подборку товаров.
 */
export async function updateModeratorCollectionController(
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

  const bodyResult =
    updateModeratorCollectionSchema.safeParse(
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
    await updateModeratorCollection(
      paramsResult.data.collectionId,
      bodyResult.data
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

      case "COLLECTION_SLUG_ALREADY_EXISTS":
        res.status(409).json({
          error: {
            code:
              "COLLECTION_SLUG_ALREADY_EXISTS",

            message:
              "Подборка с таким slug уже существует"
          }
        });

        return;

      case "AUTOMATION_RULES_REQUIRED":
        res.status(400).json({
          error: {
            code:
              "AUTOMATION_RULES_REQUIRED",

            message:
              "Для автоматической подборки обязательны правила автоматизации"
          }
        });

        return;

      case "INVALID_COLLECTION_DATES":
        res.status(400).json({
          error: {
            code:
              "INVALID_COLLECTION_DATES",

            message:
              "Дата окончания должна быть позже даты начала"
          }
        });

        return;
    }
  }

  res.json({
    data:
      result.collection
  });
}