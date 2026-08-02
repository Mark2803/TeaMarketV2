import type {
  Request,
  Response
} from "express";

import {
  moderatorOrdersQuerySchema
} from "./moderator-orders.query.js";

import {
  getModeratorOrders
} from "./moderator-orders.service.js";

export async function getModeratorOrdersController(
  req: Request,
  res: Response
): Promise<void> {
  const queryResult =
    moderatorOrdersQuerySchema.safeParse(
      req.query
    );

  if (!queryResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_MODERATOR_ORDERS_QUERY",

        message:
          "Некорректные параметры списка заказов",

        details:
          queryResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await getModeratorOrders(
      queryResult.data
    );

  res.json({
    data:
      result.items,

    pagination:
      result.pagination
  });
}