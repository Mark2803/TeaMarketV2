import { prisma } from "../../../database/prisma.js";

export type DeleteModeratorProductCollectionResult =
  | {
      success: true;
      productId: string;
      collectionId: string;
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "COLLECTION_NOT_FOUND"
        | "PRODUCT_COLLECTION_NOT_FOUND";
    };

/**
 * Удаляет товар из подборки.
 *
 * Сам товар и сама подборка не удаляются.
 */
export async function deleteModeratorProductCollection(
  productId: string,
  collectionId: string
): Promise<DeleteModeratorProductCollectionResult> {
  const [product, collection] =
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

      prisma.collections.findUnique({
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
    await prisma.collection_products.findUnique({
      where: {
        collection_id_product_id: {
          collection_id:
            collectionId,

          product_id:
            productId
        }
      },

      select: {
        product_id: true
      }
    });

  if (!productCollection) {
    return {
      success: false,
      error:
        "PRODUCT_COLLECTION_NOT_FOUND"
    };
  }

  await prisma.collection_products.delete({
    where: {
      collection_id_product_id: {
        collection_id:
          collectionId,

        product_id:
          productId
      }
    }
  });

  return {
    success: true,
    productId,
    collectionId
  };
}