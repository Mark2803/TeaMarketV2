import type {
  Request,
  Response
} from "express";

import {
  moderatorProductImageParamsSchema,
  updateModeratorProductImageSchema
} from "./moderator-product-image.schemas.js";

import {
  updateModeratorProductImage
} from "./moderator-product-image-update.service.js";

/**
 * Обновляет изображение товара.
 */
export async function updateModeratorProductImageController(
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

  const bodyResult =
    updateModeratorProductImageSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_IMAGE_DATA",

        message:
          "Некорректные данные изображения",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateModeratorProductImage(
      paramsResult.data.productId,
      paramsResult.data.imageId,
      bodyResult.data
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

      case "IMAGE_ALREADY_EXISTS":
        res.status(409).json({
          error: {
            code:
              "IMAGE_ALREADY_EXISTS",

            message:
              "Такое изображение уже добавлено к товару"
          }
        });

        return;
    }
  }

  res.json({
    data:
      result.image
  });
}