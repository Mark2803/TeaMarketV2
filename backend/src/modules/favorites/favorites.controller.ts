import type {
  Request,
  Response
} from "express";

import {
  favoriteProductParamsSchema
} from "./favorites.schemas.js";

import {
  addCustomerFavorite,
  getCustomerFavorites,
  removeCustomerFavorite
} from "./favorites.service.js";

function getAuthorizedCustomerId(
  req: Request,
  res: Response
) {
  const customerId =
    req.customer?.id;

  if (!customerId) {
    res.status(401).json({
      error: {
        code:
          "UNAUTHORIZED",

        message:
          "Требуется авторизация"
      }
    });

    return null;
  }

  return customerId;
}

export async function getFavoritesController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const favorites =
    await getCustomerFavorites(
      customerId
    );

  res.json({
    data: favorites
  });
}

export async function addFavoriteController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const paramsResult =
    favoriteProductParamsSchema
      .safeParse(
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

  const result =
    await addCustomerFavorite(
      customerId,
      paramsResult.data.productId
    );

  if (!result.success) {
    res.status(404).json({
      error: {
        code:
          "PRODUCT_NOT_FOUND",

        message:
          "Товар не найден или недоступен"
      }
    });

    return;
  }

  res.status(201).json({
    data: {
      productId:
        paramsResult.data.productId,

      isFavorite:
        true
    }
  });
}

export async function removeFavoriteController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const paramsResult =
    favoriteProductParamsSchema
      .safeParse(
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

  await removeCustomerFavorite(
    customerId,
    paramsResult.data.productId
  );

  res.json({
    data: {
      productId:
        paramsResult.data.productId,

      isFavorite:
        false
    }
  });
}
import { favoriteProductIdsBodySchema } from "./favorites.schemas.js";
import { mergeCustomerFavorites, resolveFavoriteProducts } from "./favorites.service.js";

export async function resolveFavoritesController(req: Request, res: Response): Promise<void> {
  const parsed = favoriteProductIdsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_PRODUCT_IDS", message: "Некорректный список товаров", details: parsed.error.flatten() } });
    return;
  }
  res.json({ data: await resolveFavoriteProducts(parsed.data.productIds) });
}

export async function mergeFavoritesController(req: Request, res: Response): Promise<void> {
  const customerId = getAuthorizedCustomerId(req, res);
  if (!customerId) return;
  const parsed = favoriteProductIdsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_PRODUCT_IDS", message: "Некорректный список товаров", details: parsed.error.flatten() } });
    return;
  }
  res.json({ data: await mergeCustomerFavorites(customerId, parsed.data.productIds) });
}
