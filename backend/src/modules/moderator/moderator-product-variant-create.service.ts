import { prisma } from "../../database/prisma.js";

import type {
  CreateModeratorProductVariantInput
} from "./moderator-product.schemas.js";

export type CreateModeratorProductVariantResult =
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
        createdAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "VARIANT_SKU_ALREADY_EXISTS"
        | "VARIANT_WEIGHT_ALREADY_EXISTS";
    };

/**
 * Создаёт вариант товара.
 */
export async function createModeratorProductVariant(
  productId: string,
  input: CreateModeratorProductVariantInput
): Promise<CreateModeratorProductVariantResult> {
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

  const existingWeight =
    await prisma.product_variants.findFirst({
      where: {
        product_id:
          productId,

        weight_g:
          input.weightG
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

  const variant =
    await prisma.product_variants.create({
      data: {
        product_id:
          productId,

        sku:
          input.sku,

        weight_g:
          input.weightG,

        price:
          input.price,

        stock_quantity:
          input.stockQuantity,

        sort_order:
          input.sortOrder,

        is_available:
          input.isAvailable,

        status:
          input.status,

        ...(input.oldPrice
          !== undefined
          ? {
              old_price:
                input.oldPrice
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
        created_at: true
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

      createdAt:
        variant.created_at
    }
  };
}