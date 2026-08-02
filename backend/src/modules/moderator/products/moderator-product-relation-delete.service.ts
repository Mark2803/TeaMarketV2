import { prisma } from "../../../database/prisma.js";

export type ModeratorProductRelationType =
  | "related"
  | "similar";

export type DeleteModeratorProductRelationResult =
  | {
      success: true;
      relationId: string;
      productId: string;
      relatedProductId: string;
      relationType: ModeratorProductRelationType;
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "RELATED_PRODUCT_NOT_FOUND"
        | "PRODUCT_RELATION_NOT_FOUND";
    };

/**
 * Удаляет конкретную связь между товарами.
 *
 * Тип связи обязателен, потому что одна пара товаров
 * может одновременно иметь связи related и similar.
 */
export async function deleteModeratorProductRelation(
  productId: string,
  relatedProductId: string,
  relationType: ModeratorProductRelationType
): Promise<DeleteModeratorProductRelationResult> {
  const [product, relatedProduct] =
    await Promise.all([
      prisma.products.findUnique({
        where: {
          id:
            productId
        },

        select: {
          id: true
        }
      }),

      prisma.products.findUnique({
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
    await prisma.product_relations.findUnique({
      where: {
        product_id_related_product_id_relation_type: {
          product_id:
            productId,

          related_product_id:
            relatedProductId,

          relation_type:
            relationType
        }
      },

      select: {
        id: true
      }
    });

  if (!relation) {
    return {
      success: false,
      error:
        "PRODUCT_RELATION_NOT_FOUND"
    };
  }

  await prisma.product_relations.delete({
    where: {
      id:
        relation.id
    }
  });

  return {
    success: true,
    relationId:
      relation.id,
    productId,
    relatedProductId,
    relationType
  };
}