import type {
  Request,
  Response
} from "express";

import {
  moderatorStockQuerySchema
} from "./moderator-stock.query.js";

import {
  getModeratorStock
} from "./moderator-stock.service.js";

export async function getModeratorStockController(
  req: Request,
  res: Response
): Promise<void> {
  const queryResult =
    moderatorStockQuerySchema.safeParse(
      req.query
    );

  if (!queryResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_MODERATOR_STOCK_QUERY",

        message:
          "Некорректные параметры списка остатков",

        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getModeratorStock(
      queryResult.data
    );

  res.json({
    data:
      result.items,

    pagination:
      result.pagination
  });
}
