import { prisma } from "../../../database/prisma.js";

import {
  deleteObjectFromStorage
} from "../../../lib/s3-delete.js";

export type DeleteModeratorProductImageResult =
  | {
      success: true;
      imageId: string;
      productId: string;
      objectKey: string | null;
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "IMAGE_NOT_FOUND";
    };

/**
 * Извлекает ключ объекта из публичного URL Yandex Object Storage.
 */
function getObjectKeyFromImageUrl(
  imageUrl: string
): string | null {
  try {
    const url =
      new URL(
        imageUrl
      );

    const objectKey =
      decodeURIComponent(
        url.pathname.replace(
          /^\/+/,
          ""
        )
      );

    return objectKey || null;
  } catch {
    return null;
  }
}

/**
 * Удаляет изображение товара из Object Storage
 * и затем удаляет запись из базы данных.
 */
export async function deleteModeratorProductImage(
  productId: string,
  imageId: string
): Promise<DeleteModeratorProductImageResult> {
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

  const objectKey =
    getObjectKeyFromImageUrl(
      image.image_url
    );

  if (objectKey) {
    await deleteObjectFromStorage(
      objectKey
    );
  }

  await prisma.product_images.delete({
    where: {
      id:
        imageId
    }
  });

  return {
    success: true,
    imageId,
    productId,
    objectKey
  };
}