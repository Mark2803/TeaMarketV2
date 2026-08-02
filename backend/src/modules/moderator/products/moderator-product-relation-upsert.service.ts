import { prisma } from "../../../database/prisma.js";

import type {
  UpsertModeratorProductRelationInput
} from "./moderator-product-relation.schemas.js";

export type UpsertModeratorProductRelationResult =
  | {
      success: true;
      relation: {
        id: string;
        productId: string;
        relatedProductId: string;
        relationType: string;
        sortOrder: number;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "RELATED_PRODUCT_NOT_FOUND"
        | "SELF_RELATION_NOT_ALLOWED";
    };

/**
 * Создаёт или обновляет связь между товарами.
 */
export async function upsertModeratorProductRelation(
  productId: string,
  relatedProductId: string,
  input: UpsertModeratorProductRelationInput
): Promise<UpsertModeratorProductRelationResult> {
  if (
    productId ===
    relatedProductId
  ) {
    return {
      success: false,
      error:
        "SELF_RELATION_NOT_ALLOWED"
    };
  }

  return prisma.$transaction(
    async (transaction) => {
      const [product, relatedProduct] =
        await Promise.all([
          transaction.products.findUnique({
            where: {
              id:
                productId
            },

            select: {
              id: true
            }
          }),

          transaction.products.findUnique({
            where: {
              id:
                relatedProductId
            },

            select: {
              id: true
            }
          })
        ]);

      if (!product) {
        return {
          success: false,
          error:
            "PRODUCT_NOT_FOUND"
        };
      }

      if (!relatedProduct) {
        return {
          success: false,
          error:
            "RELATED_PRODUCT_NOT_FOUND"
        };
      }

      const relation =
        await transaction
          .product_relations
          .upsert({
            where: {
              product_id_related_product_id_relation_type: {
                product_id:
                  productId,

                related_product_id:
                  relatedProductId,

                relation_type:
                  input.relationType
              }
            },

            create: {
              product_id:
                productId,

              related_product_id:
                relatedProductId,

              relation_type:
                input.relationType,

              sort_order:
                input.sortOrder
            },

            update: {
              sort_order:
                input.sortOrder
            },

            select: {
              id: true,
              product_id: true,
              related_product_id: true,
              relation_type: true,
              sort_order: true
            }
          });

      return {
        success: true,

        relation: {
          id:
            relation.id,

          productId:
            relation.product_id,

          relatedProductId:
            relation.related_product_id,

          relationType:
            relation.relation_type,

          sortOrder:
            relation.sort_order
        }
      };
    }
  );
}