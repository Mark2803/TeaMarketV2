import type {
  Request,
  Response
} from "express";

import {
  moderatorProductRelationParamsSchema,
  upsertModeratorProductRelationSchema
} from "./moderator-product-relation.schemas.js";

import {
  upsertModeratorProductRelation
} from "./moderator-product-relation-upsert.service.js";

export async function upsertModeratorProductRelationController(
  req: Request,
  res: Response
): Promise<void> {
  const params =
    moderatorProductRelationParamsSchema.safeParse(
      req.params
    );

  if (!params.success) {
    res.status(400).json({
      error: {
        code: "INVALID_PARAMS",
        message:
          "Некорректные параметры",
        details:
          params.error.flatten()
      }
    });

    return;
  }

  const body =
    upsertModeratorProductRelationSchema.safeParse(
      req.body
    );

  if (!body.success) {
    res.status(400).json({
      error: {
        code: "INVALID_BODY",
        message:
          "Некорректные данные",
        details:
          body.error.flatten()
      }
    });

    return;
  }

  const result =
    await upsertModeratorProductRelation(
      params.data.productId,
      params.data.relatedProductId,
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

      case "RELATED_PRODUCT_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "RELATED_PRODUCT_NOT_FOUND",
            message:
              "Связанный товар не найден"
          }
        });
        return;

      case "SELF_RELATION_NOT_ALLOWED":
        res.status(400).json({
          error: {
            code:
              "SELF_RELATION_NOT_ALLOWED",
            message:
              "Нельзя связать товар с самим собой"
          }
        });
        return;
    }
  }

  res.json({
    data: result.relation
  });
}