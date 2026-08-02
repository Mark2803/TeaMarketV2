import type {
  Request,
  Response
} from "express";

import {
  moderatorProductsQuerySchema
} from "./moderator-products.query.js";

import {
  getModeratorProducts
} from "./moderator-products.service.js";

export async function getModeratorProductsController(
  req: Request,
  res: Response
): Promise<void> {
  const queryResult =
    moderatorProductsQuerySchema.safeParse(
      req.query
    );

  if (!queryResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_MODERATOR_PRODUCTS_QUERY",

        message:
          "Некорректные параметры списка товаров",

        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getModeratorProducts(
      queryResult.data
    );

  res.json({
    data:
      result.items,

    pagination:
      result.pagination
  });
}