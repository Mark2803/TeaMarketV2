import type {
  Request,
  Response
} from "express";

import {
  productsQuerySchema
} from "../products/products.query.js";

import {
  getCategories,
  getCategoryBySlug,
  getCategoryProductsBySlug
} from "./categories.service.js";

export async function getCategoriesController(
  _req: Request,
  res: Response
): Promise<void> {
  const categories =
    await getCategories();

  res.json({
    data: categories
  });
}

export async function getCategoryBySlugController(
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
          "INVALID_CATEGORY_SLUG",
        message:
          "Slug категории не указан"
      }
    });

    return;
  }

  const category =
    await getCategoryBySlug(slug);

  if (!category) {
    res.status(404).json({
      error: {
        code:
          "CATEGORY_NOT_FOUND",
        message:
          "Категория не найдена"
      }
    });

    return;
  }

  res.json({
    data: category
  });
}

export async function getCategoryProductsController(
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
          "INVALID_CATEGORY_SLUG",
        message:
          "Slug категории не указан"
      }
    });

    return;
  }

  const queryResult =
    productsQuerySchema.safeParse(
      req.query
    );

  if (!queryResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCTS_QUERY",
        message:
          "Некорректные параметры каталога",
        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getCategoryProductsBySlug(
      slug,
      queryResult.data
    );

  if (!result) {
    res.status(404).json({
      error: {
        code:
          "CATEGORY_NOT_FOUND",
        message:
          "Категория не найдена"
      }
    });

    return;
  }

  res.json({
    data: result.items,
    category: result.category,
    pagination:
      result.pagination
  });
}