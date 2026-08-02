import type {
  Request,
  Response
} from "express";

import {
  moderatorProductImageParamsSchema
} from "./moderator-product-image.schemas.js";

import {
  replaceModeratorProductImage
} from "./moderator-product-image-replace.service.js";

/**
 * Заменяет файл существующего изображения товара.
 */
export async function replaceModeratorProductImageController(
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
    altTextRaw === undefined
      ? undefined
      : (
          typeof altTextRaw === "string"
          && altTextRaw.trim() !== ""
            ? altTextRaw.trim()
            : null
        );

  let sortOrder:
    number | undefined;

  if (
    sortOrderRaw !== undefined
    && sortOrderRaw !== ""
  ) {
    const parsedSortOrder =
      Number(
        sortOrderRaw
      );

    if (
      !Number.isInteger(
        parsedSortOrder
      )
      || parsedSortOrder < 0
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

    sortOrder =
      parsedSortOrder;
  }

  const result =
    await replaceModeratorProductImage(
      paramsResult.data.productId,
      paramsResult.data.imageId,
      req.file,
      altText,
      sortOrder
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

      case "INVALID_IMAGE_URL":
        res.status(400).json({
          error: {
            code:
              "INVALID_IMAGE_URL",

            message:
              "Некорректный URL существующего изображения"
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