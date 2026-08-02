import { prisma } from "../../../database/prisma.js";

export type DeleteModeratorProductCategoryResult =
  | {
      success: true;
      productId: string;
      categoryId: string;
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "CATEGORY_NOT_FOUND"
        | "PRODUCT_CATEGORY_NOT_FOUND";
    };

/**
 * Удаляет категорию из товара.
 *
 * Сам товар и сама категория не удаляются.
 */
export async function deleteModeratorProductCategory(
  productId: string,
  categoryId: string
): Promise<DeleteModeratorProductCategoryResult> {
  const [product, category] =
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

      prisma.categories.findUnique({
        where: {
          id:
            categoryId
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

  if (!category) {
    return {
      success: false,
      error:
        "CATEGORY_NOT_FOUND"
    };
  }

  const productCategory =
    await prisma.product_categories.findUnique({
      where: {
        product_id_category_id: {
          product_id:
            productId,

          category_id:
            categoryId
        }
      },

      select: {
        product_id: true
      }
    });

  if (!productCategory) {
    return {
      success: false,
      error:
        "PRODUCT_CATEGORY_NOT_FOUND"
    };
  }

  await prisma.product_categories.delete({
    where: {
      product_id_category_id: {
        product_id:
          productId,

        category_id:
          categoryId
      }
    }
  });

  return {
    success: true,
    productId,
    categoryId
  };
}