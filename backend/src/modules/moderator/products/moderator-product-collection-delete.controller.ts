import type {
  Request,
  Response
} from "express";

import {
  moderatorProductCollectionParamsSchema
} from "./moderator-product-collection.schemas.js";

import {
  deleteModeratorProductCollection
} from "./moderator-product-collection-delete.service.js";

export async function deleteModeratorProductCollectionController(
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

  const result =
    await deleteModeratorProductCollection(
      paramsResult.data.productId,
      paramsResult.data.collectionId
    );

  if (!result.success) {
    switch (result.error) {
      case "PRODUCT_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PRODUCT_NOT_FOUND",

            message:
              "Товар не найден"
          }
        });

        return;

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

      case "PRODUCT_COLLECTION_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PRODUCT_COLLECTION_NOT_FOUND",

            message:
              "Товар не добавлен в подборку"
          }
        });

        return;
    }
  }

  res.json({
    data: {
      productId:
        result.productId,

      collectionId:
        result.collectionId,

      deleted:
        true
    }
  });
}