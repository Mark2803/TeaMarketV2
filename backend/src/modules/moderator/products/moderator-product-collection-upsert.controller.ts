import type {
  Request,
  Response
} from "express";

import {
  moderatorProductCollectionParamsSchema,
  upsertModeratorProductCollectionSchema
} from "./moderator-product-collection.schemas.js";

import {
  upsertModeratorProductCollection
} from "./moderator-product-collection-upsert.service.js";

export async function upsertModeratorProductCollectionController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorProductCollectionParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_COLLECTION_ID",

        message:
          "Некорректный ID товара или подборки",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    upsertModeratorProductCollectionSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_COLLECTION_DATA",

        message:
          "Некорректные данные подборки товара",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await upsertModeratorProductCollection(
      paramsResult.data.productId,
      paramsResult.data.collectionId,
      bodyResult.data
    );

  if (!result.success) {
    if (
      result.error ===
      "PRODUCT_NOT_FOUND"
    ) {
      res.status(404).json({
        error: {
          code:
            "PRODUCT_NOT_FOUND",

          message:
            "Товар не найден"
        }
      });

      return;
    }

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
      result.productCollection
  });
}