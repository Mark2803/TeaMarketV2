import type {
  Request,
  Response
} from "express";

import {
  searchProducts
} from "./search.service.js";

export async function searchProductsController(
  req: Request,
  res: Response
): Promise<void> {
  const queryParam = req.query.q;

  const query = Array.isArray(queryParam)
    ? queryParam[0]
    : queryParam;

  if (
    typeof query !== "string" ||
    query.trim().length < 2
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_SEARCH_QUERY",
        message:
          "Поисковый запрос должен содержать минимум 2 символа"
      }
    });

    return;
  }

  const products =
    await searchProducts(query.trim());

  res.json({
    data: products
  });
}