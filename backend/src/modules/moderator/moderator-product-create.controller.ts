import type {
  Request,
  Response
} from "express";

import {
  createModeratorProductSchema
} from "./moderator-product.schemas.js";

import {
  createModeratorProduct
} from "./moderator-product-create.service.js";

export async function createModeratorProductController(
  req: Request,
  res: Response
): Promise<void> {
  const bodyResult =
    createModeratorProductSchema.safeParse(req.body);

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code: "INVALID_PRODUCT_DATA",
        message: "Некорректные данные товара",
        details: bodyResult.error.flatten()
      }
    });
    return;
  }

  const result =
    await createModeratorProduct(bodyResult.data);

  if (!result.success) {
    if (result.error === "VARIANT_SKU_ALREADY_EXISTS") {
      res.status(409).json({
        error: {
          code: "VARIANT_SKU_ALREADY_EXISTS",
          message: "Вариант с таким SKU уже существует"
        }
      });
      return;
    }

    res.status(409).json({
      error: {
        code: "PRODUCT_SLUG_ALREADY_EXISTS",
        message: "Товар с таким slug уже существует"
      }
    });
    return;
  }

  res.status(201).json({
    data: result.product
  });
}
