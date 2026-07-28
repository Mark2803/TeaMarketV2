import type {
  Request,
  Response
} from "express";

import {
  productsQuerySchema
} from "./products.query.js";

import {
  getProductBySlug,
  getProducts
} from "./products.service.js";

export async function getProductsController(
  req: Request,
  res: Response
): Promise<void> {
  const result =
    productsQuerySchema.safeParse(
      req.query
    );

  if (!result.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCTS_QUERY",

        message:
          "Некорректные параметры каталога",

        details:
          result.error.flatten()
      }
    });

    return;
  }

  const resultData =
    await getProducts(
      result.data
    );

  res.json({
    data: resultData.items,
    pagination:
      resultData.pagination
  });
}

export async function getProductBySlugController(
  req: Request,
  res: Response
): Promise<void> {
  const slugParam =
    req.params.slug;

  const slug =
    Array.isArray(slugParam)
      ? slugParam[0]
      : slugParam;

  if (!slug) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_SLUG",

        message:
          "Slug товара не указан"
      }
    });

    return;
  }

  const product =
    await getProductBySlug(slug);

  if (!product) {
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

  res.json({
    data: product
  });
}