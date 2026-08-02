import type {
  Request,
  Response
} from "express";

import {
  moderatorProductParamsSchema
} from "../moderator-product.schemas.js";

import {
  uploadModeratorProductImage
} from "./moderator-product-image-upload.service.js";

/**
 * Загружает файл изображения товара
 * в Object Storage и создаёт запись в БД.
 */
export async function uploadModeratorProductImageController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorProductParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_ID",

        message:
          "Некорректный ID товара",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  if (!req.file) {
    res.status(400).json({
      error: {
        code:
          "IMAGE_FILE_REQUIRED",

        message:
          "Файл изображения не передан"
      }
    });

    return;
  }

  const altTextRaw =
    req.body.altText;

  const sortOrderRaw =
    req.body.sortOrder;

  const altText =
    typeof altTextRaw === "string"
      && altTextRaw.trim() !== ""
        ? altTextRaw.trim()
        : null;

  const sortOrder =
    sortOrderRaw === undefined
      || sortOrderRaw === ""
        ? 0
        : Number(sortOrderRaw);

  if (
    !Number.isInteger(sortOrder)
    || sortOrder < 0
  ) {
    res.status(400).json({
      error: {
        code:
          "INVALID_IMAGE_SORT_ORDER",

        message:
          "Порядок сортировки должен быть целым неотрицательным числом"
      }
    });

    return;
  }

  const result =
    await uploadModeratorProductImage(
      paramsResult.data.productId,
      req.file,
      altText,
      sortOrder
    );

  if (!result.success) {
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

  res.status(201).json({
    data:
      result.image
  });
}