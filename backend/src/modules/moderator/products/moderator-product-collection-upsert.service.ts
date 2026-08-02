import { prisma } from "../../../database/prisma.js";

import type {
  UpsertModeratorProductCollectionInput
} from "./moderator-product-collection.schemas.js";

export type UpsertModeratorProductCollectionResult =
  | {
      success: true;
      productCollection: {
        productId: string;
        collectionId: string;
        sortOrder: number;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "COLLECTION_NOT_FOUND";
    };

/**
 * Добавляет товар в подборку
 * или обновляет порядок существующей связи.
 */
export async function upsertModeratorProductCollection(
  productId: string,
  collectionId: string,
  input: UpsertModeratorProductCollectionInput
): Promise<UpsertModeratorProductCollectionResult> {
  return prisma.$transaction(
    async (transaction) => {
      const [product, collection] =
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

          transaction.collections.findUnique({
            where: {
              id:
                collectionId
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

      if (!collection) {
        return {
          success: false,
          error:
            "COLLECTION_NOT_FOUND"
        };
      }

      const productCollection =
        await transaction
          .collection_products
          .upsert({
            where: {
              collection_id_product_id: {
                collection_id:
                  collectionId,

                product_id:
                  productId
              }
            },

            create: {
              collection_id:
                collectionId,

              product_id:
                productId,

              sort_order:
                input.sortOrder
            },

            update: {
              sort_order:
                input.sortOrder
            },

            select: {
              collection_id: true,
              product_id: true,
              sort_order: true
            }
          });

      return {
        success: true,

        productCollection: {
          productId:
            productCollection.product_id,

          collectionId:
            productCollection.collection_id,

          sortOrder:
            productCollection.sort_order
        }
      };
    }
  );
}