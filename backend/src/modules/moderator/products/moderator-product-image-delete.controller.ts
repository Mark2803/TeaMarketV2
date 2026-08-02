import type {
  Request,
  Response
} from "express";

import {
  moderatorProductImageParamsSchema
} from "./moderator-product-image.schemas.js";

import {
  deleteModeratorProductImage
} from "./moderator-product-image-delete.service.js";

/**
 * Удаляет изображение товара.
 */
export async function deleteModeratorProductImageController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorProductImageParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_IMAGE_ID",

        message:
          "Некорректный ID товара или изображения",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await deleteModeratorProductImage(
      paramsResult.data.productId,
      paramsResult.data.imageId
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

      case "IMAGE_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "IMAGE_NOT_FOUND",

            message:
              "Изображение товара не найдено"
          }
        });

        return;
    }
  }

  res.json({
    data: {
      productId:
        result.productId,

      imageId:
        result.imageId,

      deleted:
        true
    }
  });
}