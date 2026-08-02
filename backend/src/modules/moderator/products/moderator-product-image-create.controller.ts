import type {
  Request,
  Response
} from "express";

import {
  moderatorProductParamsSchema
} from "../moderator-product.schemas.js";

import {
  createModeratorProductImageSchema
} from "./moderator-product-image.schemas.js";

import {
  createModeratorProductImage
} from "./moderator-product-image-create.service.js";

export async function createModeratorProductImageController(
  req: Request,
  res: Response
): Promise<void> {
  const params =
    moderatorProductParamsSchema.safeParse(
      req.params
    );

  if (!params.success) {
    res.status(400).json({
      error: {
        code: "INVALID_PRODUCT_ID",
        message: "Некорректный ID товара",
        details: params.error.flatten()
      }
    });

    return;
  }

  const body =
    createModeratorProductImageSchema.safeParse(
      req.body
    );

  if (!body.success) {
    res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message: "Некорректные данные",
        details: body.error.flatten()
      }
    });

    return;
  }

  const result =
    await createModeratorProductImage(
      params.data.productId,
      body.data
    );

  if (!result.success) {
    switch (result.error) {
      case "PRODUCT_NOT_FOUND":
        res.status(404).json({
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Товар не найден"
          }
        });

        return;

      case "IMAGE_ALREADY_EXISTS":
        res.status(409).json({
          error: {
            code: "IMAGE_ALREADY_EXISTS",
            message: "Такое изображение уже существует"
          }
        });

        return;
    }
  }

  res.status(201).json({
    data: result.image
  });
}