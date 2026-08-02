import { prisma } from "../../database/prisma.js";

export type DeleteModeratorProductResult =
  | {
      success: true;
      productId: string;
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "PRODUCT_IN_ORDERS"
        | "PRODUCT_IN_CARTS";
    };

/**
 * Безопасно удаляет товар.
 *
 * Физическое удаление разрешено только если:
 * - товар не использовался в заказах;
 * - варианты товара не использовались в корзинах.
 *
 * Связанные категории, подборки, изображения,
 * избранное и варианты удалятся каскадно
 * согласно ограничениям базы данных.
 */
export async function deleteModeratorProduct(
  productId: string
): Promise<DeleteModeratorProductResult> {
  return prisma.$transaction(
    async (transaction) => {
      const product =
        await transaction.products.findUnique({
          where: {
            id:
              productId
          },

          select: {
            id: true
          }
        });

      if (!product) {
        return {
          success: false,
          error:
            "PRODUCT_NOT_FOUND"
        };
      }

      const orderItemCount =
        await transaction.order_items.count({
          where: {
            product_id:
              productId
          }
        });

      if (orderItemCount > 0) {
        return {
          success: false,
          error:
            "PRODUCT_IN_ORDERS"
        };
      }

      const cartItemCount =
        await transaction.cart_items.count({
          where: {
            product_variants: {
              product_id:
                productId
            }
          }
        });

      if (cartItemCount > 0) {
        return {
          success: false,
          error:
            "PRODUCT_IN_CARTS"
        };
      }

      await transaction.products.delete({
        where: {
          id:
            productId
        }
      });

      return {
        success: true,
        productId
      };
    }
  );
}