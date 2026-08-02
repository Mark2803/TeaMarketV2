import { prisma } from "../../../database/prisma.js";

import type {
  CreateModeratorProductImageInput
} from "./moderator-product-image.schemas.js";

export type CreateModeratorProductImageResult =
  | {
      success: true;
      image: {
        id: string;
        productId: string;
        imageUrl: string;
        altText: string | null;
        sortOrder: number;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "IMAGE_ALREADY_EXISTS";
    };

/**
 * Добавляет изображение товару.
 */
export async function createModeratorProductImage(
  productId: string,
  input: CreateModeratorProductImageInput
): Promise<CreateModeratorProductImageResult> {
  const product =
    await prisma.products.findUnique({
      where: {
        id: productId
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

  const exists =
    await prisma.product_images.findFirst({
      where: {
        product_id:
          productId,

        image_url:
          input.imageUrl
      },

      select: {
        id: true
      }
    });

  if (exists) {
    return {
      success: false,
      error:
        "IMAGE_ALREADY_EXISTS"
    };
  }

  const image =
    await prisma.product_images.create({
      data: {
        product_id:
          productId,

        image_url:
          input.imageUrl,

        alt_text:
          input.altText ?? null,

        sort_order:
          input.sortOrder
      },

      select: {
        id: true,
        product_id: true,
        image_url: true,
        alt_text: true,
        sort_order: true
      }
    });

  return {
    success: true,

    image: {
      id:
        image.id,

      productId:
        image.product_id,

      imageUrl:
        image.image_url,

      altText:
        image.alt_text,

      sortOrder:
        image.sort_order
    }
  };
}