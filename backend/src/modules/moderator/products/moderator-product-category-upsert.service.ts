import { prisma } from "../../../database/prisma.js";

import type {
  UpsertModeratorProductCategoryInput
} from "./moderator-product-category.schemas.js";

export type UpsertModeratorProductCategoryResult =
  | {
      success: true;
      productCategory: {
        productId: string;
        categoryId: string;
        isPrimary: boolean;
        sortOrder: number;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "CATEGORY_NOT_FOUND";
    };

/**
 * Добавляет категорию к товару
 * или обновляет существующую привязку.
 */
export async function upsertModeratorProductCategory(
  productId: string,
  categoryId: string,
  input: UpsertModeratorProductCategoryInput
): Promise<UpsertModeratorProductCategoryResult> {
  return prisma.$transaction(
    async (transaction) => {
      const [product, category] =
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

          transaction.categories.findUnique({
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

      if (input.isPrimary) {
        await transaction
          .product_categories
          .updateMany({
            where: {
              product_id:
                productId,

              is_primary:
                true
            },

            data: {
              is_primary:
                false
            }
          });
      }

      const productCategory =
        await transaction
          .product_categories
          .upsert({
            where: {
              product_id_category_id: {
                product_id:
                  productId,

                category_id:
                  categoryId
              }
            },

            create: {
              product_id:
                productId,

              category_id:
                categoryId,

              is_primary:
                input.isPrimary,

              sort_order:
                input.sortOrder
            },

            update: {
              is_primary:
                input.isPrimary,

              sort_order:
                input.sortOrder
            },

            select: {
              product_id: true,
              category_id: true,
              is_primary: true,
              sort_order: true
            }
          });

      return {
        success: true,

        productCategory: {
          productId:
            productCategory.product_id,

          categoryId:
            productCategory.category_id,

          isPrimary:
            productCategory.is_primary,

          sortOrder:
            productCategory.sort_order
        }
      };
    }
  );
}