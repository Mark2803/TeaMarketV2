import { prisma } from "../../../database/prisma.js";

import type {
  UpdateModeratorProductImageInput
} from "./moderator-product-image.schemas.js";

export type UpdateModeratorProductImageResult =
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
        | "IMAGE_NOT_FOUND"
        | "IMAGE_ALREADY_EXISTS";
    };

/**
 * Обновляет данные изображения товара.
 *
 * В Prisma передаются только поля,
 * которые действительно присутствуют в PATCH.
 */
export async function updateModeratorProductImage(
  productId: string,
  imageId: string,
  input: UpdateModeratorProductImageInput
): Promise<UpdateModeratorProductImageResult> {
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

  const image =
    await prisma.product_images.findFirst({
      where: {
        id:
          imageId,

        product_id:
          productId
      },

      select: {
        id: true,
        product_id: true,
        image_url: true
      }
    });

  if (!image) {
    return {
      success: false,
      error:
        "IMAGE_NOT_FOUND"
    };
  }

  if (
    input.imageUrl !== undefined
    && input.imageUrl !== image.image_url
  ) {
    const duplicateImage =
      await prisma.product_images.findFirst({
        where: {
          product_id:
            productId,

          image_url:
            input.imageUrl,

          NOT: {
            id:
              imageId
          }
        },

        select: {
          id: true
        }
      });

    if (duplicateImage) {
      return {
        success: false,
        error:
          "IMAGE_ALREADY_EXISTS"
      };
    }
  }

  const updateData: {
    image_url?: string;
    alt_text?: string | null;
    sort_order?: number;
  } = {};

  if (
    input.imageUrl !== undefined
  ) {
    updateData.image_url =
      input.imageUrl;
  }

  if (
    input.altText !== undefined
  ) {
    updateData.alt_text =
      input.altText;
  }

  if (
    input.sortOrder !== undefined
  ) {
    updateData.sort_order =
      input.sortOrder;
  }

  const updatedImage =
    await prisma.product_images.update({
      where: {
        id:
          imageId
      },

      data:
        updateData,

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
        updatedImage.id,

      productId:
        updatedImage.product_id,

      imageUrl:
        updatedImage.image_url,

      altText:
        updatedImage.alt_text,

      sortOrder:
        updatedImage.sort_order
    }
  };
}