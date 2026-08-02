import { prisma } from "../../../database/prisma.js";

export type DeleteModeratorCollectionResult =
  | {
      success: true;
      collectionId: string;
    }
  | {
      success: false;
      error:
        | "COLLECTION_NOT_FOUND"
        | "COLLECTION_HAS_PRODUCTS";
    };

/**
 * Безопасно удаляет подборку.
 *
 * Удаление запрещено, если в подборке
 * ещё есть привязанные товары.
 */
export async function deleteModeratorCollection(
  collectionId: string
): Promise<DeleteModeratorCollectionResult> {
  const collection =
    await prisma.collections.findUnique({
      where: {
        id:
          collectionId
      },

      select: {
        id: true
      }
    });

  if (!collection) {
    return {
      success: false,
      error:
        "COLLECTION_NOT_FOUND"
    };
  }

  const productCount =
    await prisma.collection_products.count({
      where: {
        collection_id:
          collectionId
      }
    });

  if (productCount > 0) {
    return {
      success: false,
      error:
        "COLLECTION_HAS_PRODUCTS"
    };
  }

  await prisma.collections.delete({
    where: {
      id:
        collectionId
    }
  });

  return {
    success: true,
    collectionId
  };
}