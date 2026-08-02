import type {
  Request,
  Response
} from "express";

import {
  moderatorProductRelationParamsSchema,
  moderatorProductRelationTypeSchema
} from "./moderator-product-relation.schemas.js";

import {
  deleteModeratorProductRelation
} from "./moderator-product-relation-delete.service.js";

export async function deleteModeratorProductRelationController(
  req: Request,
  res: Response
): Promise<void> {
  const paramsResult =
    moderatorProductRelationParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_RELATION_ID",

        message:
          "Некорректный ID товара",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const relationTypeResult =
    moderatorProductRelationTypeSchema.safeParse(
      req.query.relationType
    );

  if (!relationTypeResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_PRODUCT_RELATION_TYPE",

        message:
          "Укажите relationType: related или similar",

        details:
          relationTypeResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await deleteModeratorProductRelation(
      paramsResult.data.productId,
      paramsResult.data.relatedProductId,
      relationTypeResult.data
    );

  if (!result.success) {
    switch (result.error) {
      case "PRODUCT_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PRODUCT_NOT_FOUND",

            message:
              "Товар не найден"
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

      case "PRODUCT_RELATION_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "PRODUCT_RELATION_NOT_FOUND",

            message:
              "Связь между товарами не найдена"
          }
        });

        return;
    }
  }

  res.json({
    data: {
      relationId:
        result.relationId,

      productId:
        result.productId,

      relatedProductId:
        result.relatedProductId,

      relationType:
        result.relationType,

      deleted:
        true
    }
  });
}