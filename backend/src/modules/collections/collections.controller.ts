import type {
  Request,
  Response
} from "express";

import {
  productsQuerySchema
} from "../products/products.query.js";

import {
  getCollectionBySlug,
  getCollectionProductsBySlug,
  getCollections
} from "./collections.service.js";

export async function getCollectionsController(
  _req: Request,
  res: Response
): Promise<void> {
  const collections =
    await getCollections();

  res.json({
    data: collections
  });
}

export async function getCollectionBySlugController(
  req: Request,
  res: Response
): Promise<void> {
  const slugParam = req.params.slug;

  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : slugParam;

  if (!slug) {
    res.status(400).json({
      error: {
        code: "INVALID_COLLECTION_SLUG",
        message:
          "Slug подборки не указан"
      }
    });

    return;
  }

  const collection =
    await getCollectionBySlug(slug);

  if (!collection) {
    res.status(404).json({
      error: {
        code: "COLLECTION_NOT_FOUND",
        message:
          "Подборка не найдена"
      }
    });

    return;
  }

  res.json({
    data: collection
  });
}

export async function getCollectionProductsController(
  req: Request,
  res: Response
): Promise<void> {
  const slugParam = req.params.slug;

  const slug = Array.isArray(slugParam)
    ? slugParam[0]
    : slugParam;

  if (!slug) {
    res.status(400).json({
      error: {
        code: "INVALID_COLLECTION_SLUG",
        message:
          "Slug подборки не указан"
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
        code: "INVALID_PRODUCTS_QUERY",
        message:
          "Некорректные параметры каталога",
        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getCollectionProductsBySlug(
      slug,
      queryResult.data
    );

  if (!result) {
    res.status(404).json({
      error: {
        code: "COLLECTION_NOT_FOUND",
        message:
          "Подборка не найдена"
      }
    });

    return;
  }

  res.json({
    data: result.items,
    collection:
      result.collection,
    pagination:
      result.pagination
  });
}