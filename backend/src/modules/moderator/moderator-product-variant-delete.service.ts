import { prisma } from "../../database/prisma.js";

export type DeleteModeratorProductVariantResult =
  | {
      success: true;
      variantId: string;
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "VARIANT_NOT_FOUND"
        | "VARIANT_IN_USE";
    };

/**
 * Удаляет вариант товара, если он не использовался
 * в корзинах покупателей.
 */
export async function deleteModeratorProductVariant(
  productId: string,
  variantId: string
): Promise<DeleteModeratorProductVariantResult> {
  const product =
    await prisma.products.findUnique({
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

  const variant =
    await prisma.product_variants.findFirst({
      where: {
        id:
          variantId,

        product_id:
          productId
      },

      select: {
        id: true
      }
    });

  if (!variant) {
    return {
      success: false,
      error:
        "VARIANT_NOT_FOUND"
    };
  }

  const cartItemCount =
    await prisma.cart_items.count({
      where: {
        product_variant_id:
          variantId
      }
    });

  if (cartItemCount > 0) {
    return {
      success: false,
      error:
        "VARIANT_IN_USE"
    };
  }

  await prisma.product_variants.delete({
    where: {
      id:
        variantId
    }
  });

  return {
    success: true,
    variantId
  };
}