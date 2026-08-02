import { prisma } from "../../database/prisma.js";

import type {
  UpdateModeratorProductVariantInput
} from "./moderator-product.schemas.js";

export type UpdateModeratorProductVariantResult =
  | {
      success: true;
      variant: {
        id: string;
        productId: string;
        sku: string;
        weightG: string;
        price: string;
        oldPrice: string | null;
        stockQuantity: number;
        isAvailable: boolean;
        status: string;
        sortOrder: number;
        updatedAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "VARIANT_NOT_FOUND"
        | "VARIANT_SKU_ALREADY_EXISTS"
        | "VARIANT_WEIGHT_ALREADY_EXISTS"
        | "INVALID_OLD_PRICE";
    };

/**
 * Обновляет вариант товара.
 */
export async function updateModeratorProductVariant(
  productId: string,
  variantId: string,
  input: UpdateModeratorProductVariantInput
): Promise<UpdateModeratorProductVariantResult> {
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

  const currentVariant =
    await prisma.product_variants.findFirst({
      where: {
        id:
          variantId,

        product_id:
          productId
      }
    });

  if (!currentVariant) {
    return {
      success: false,
      error:
        "VARIANT_NOT_FOUND"
    };
  }

  if (
    input.sku !== undefined
    && input.sku !== currentVariant.sku
  ) {
    const existingSku =
      await prisma.product_variants.findUnique({
        where: {
          sku:
            input.sku
        },

        select: {
          id: true
        }
      });

    if (existingSku) {
      return {
        success: false,
        error:
          "VARIANT_SKU_ALREADY_EXISTS"
      };
    }
  }

  if (
    input.weightG !== undefined
    && Number(
      currentVariant.weight_g
    ) !== input.weightG
  ) {
    const existingWeight =
      await prisma.product_variants.findFirst({
        where: {
          product_id:
            productId,

          weight_g:
            input.weightG,

          id: {
            not:
              variantId
          }
        },

        select: {
          id: true
        }
      });

    if (existingWeight) {
      return {
        success: false,
        error:
          "VARIANT_WEIGHT_ALREADY_EXISTS"
      };
    }
  }

  const finalPrice =
    input.price
    ?? Number(
      currentVariant.price
    );

  const finalOldPrice =
    input.oldPrice !== undefined
      ? input.oldPrice
      : currentVariant.old_price
        ? Number(
            currentVariant.old_price
          )
        : null;

  if (
    finalOldPrice !== null
    && finalOldPrice <= finalPrice
  ) {
    return {
      success: false,
      error:
        "INVALID_OLD_PRICE"
    };
  }

  const variant =
    await prisma.product_variants.update({
      where: {
        id:
          variantId
      },

      data: {
        ...(input.sku !== undefined
          ? {
              sku:
                input.sku
            }
          : {}),

        ...(input.weightG !== undefined
          ? {
              weight_g:
                input.weightG
            }
          : {}),

        ...(input.price !== undefined
          ? {
              price:
                input.price
            }
          : {}),

        ...(input.oldPrice !== undefined
          ? {
              old_price:
                input.oldPrice
            }
          : {}),

        ...(input.stockQuantity !== undefined
          ? {
              stock_quantity:
                input.stockQuantity
            }
          : {}),

        ...(input.sortOrder !== undefined
          ? {
              sort_order:
                input.sortOrder
            }
          : {}),

        ...(input.isAvailable !== undefined
          ? {
              is_available:
                input.isAvailable
            }
          : {}),

        ...(input.status !== undefined
          ? {
              status:
                input.status
            }
          : {})
      },

      select: {
        id: true,
        product_id: true,
        sku: true,
        weight_g: true,
        price: true,
        old_price: true,
        stock_quantity: true,
        is_available: true,
        status: true,
        sort_order: true,
        updated_at: true
      }
    });

  return {
    success: true,

    variant: {
      id:
        variant.id,

      productId:
        variant.product_id,

      sku:
        variant.sku,

      weightG:
        variant.weight_g.toString(),

      price:
        variant.price.toString(),

      oldPrice:
        variant.old_price
          ? variant.old_price.toString()
          : null,

      stockQuantity:
        variant.stock_quantity,

      isAvailable:
        variant.is_available,

      status:
        variant.status,

      sortOrder:
        variant.sort_order,

      updatedAt:
        variant.updated_at
    }
  };
}