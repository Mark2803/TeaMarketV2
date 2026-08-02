import {
  prisma
} from "../../../database/prisma.js";

import {
  uploadObjectToStorage
} from "../../../lib/s3-upload.js";

import {
  deleteObjectFromStorage
} from "../../../lib/s3-delete.js";

export type ReplaceModeratorProductImageResult =
  | {
      success: true;
      image: {
        id: string;
        productId: string;
        imageUrl: string;
        altText: string | null;
        sortOrder: number;
        objectKey: string;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "IMAGE_NOT_FOUND"
        | "INVALID_IMAGE_URL";
    };

const extensionByMimeType:
  Record<string, string> = {
    "image/jpeg":
      "jpg",

    "image/png":
      "png",

    "image/webp":
      "webp"
  };

/**
 * Извлекает ключ объекта из публичного URL.
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
 * Извлекает номер из имени image-01.png.
 */
function getImageNumberFromUrl(
  imageUrl: string
): number | null {
  const match =
    imageUrl.match(
      /\/image-(\d+)\.(?:jpg|jpeg|png|webp)$/i
    );

  if (!match?.[1]) {
    return null;
  }

  const imageNumber =
    Number(
      match[1]
    );

  return (
    Number.isInteger(
      imageNumber
    )
    && imageNumber > 0
  )
    ? imageNumber
    : null;
}

/**
 * Находит первый свободный номер изображения.
 */
function getFirstAvailableImageNumber(
  imageUrls: string[]
): number {
  const usedNumbers =
    new Set<number>();

  for (
    const imageUrl
    of imageUrls
  ) {
    const imageNumber =
      getImageNumberFromUrl(
        imageUrl
      );

    if (imageNumber !== null) {
      usedNumbers.add(
        imageNumber
      );
    }
  }

  let imageNumber = 1;

  while (
    usedNumbers.has(
      imageNumber
    )
  ) {
    imageNumber += 1;
  }

  return imageNumber;
}

/**
 * Заменяет файл существующего изображения.
 *
 * Старые UUID-имена автоматически переводятся
 * в единый формат image-01, image-02 и т. д.
 */
export async function replaceModeratorProductImage(
  productId: string,
  imageId: string,
  file: Express.Multer.File,
  altText?: string | null,
  sortOrder?: number
): Promise<ReplaceModeratorProductImageResult> {
  const product =
    await prisma.products.findUnique({
      where: {
        id:
          productId
      },

      select: {
        id: true,
        slug: true,

        product_images: {
          orderBy: [
            {
              sort_order:
                "asc"
            },

            {
              created_at:
                "asc"
            }
          ],

          select: {
            id: true,
            image_url: true
          }
        }
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
    product.product_images.find(
      (productImage) =>
        productImage.id ===
        imageId
    );

  if (!image) {
    return {
      success: false,
      error:
        "IMAGE_NOT_FOUND"
    };
  }

  const oldObjectKey =
    getObjectKeyFromImageUrl(
      image.image_url
    );

  if (!oldObjectKey) {
    return {
      success: false,
      error:
        "INVALID_IMAGE_URL"
    };
  }

  const extension =
    extensionByMimeType[
      file.mimetype
    ];

  if (!extension) {
    throw new Error(
      "Неподдерживаемый формат изображения"
    );
  }

  const existingImageNumber =
    getImageNumberFromUrl(
      image.image_url
    );

  const otherImageUrls =
    product.product_images
      .filter(
        (productImage) =>
          productImage.id !==
          imageId
      )
      .map(
        (productImage) =>
          productImage.image_url
      );

  const imageNumber =
    existingImageNumber
    ?? getFirstAvailableImageNumber(
      otherImageUrls
    );

  const formattedImageNumber =
    String(
      imageNumber
    ).padStart(
      2,
      "0"
    );

  const newObjectKey =
    [
      "products",
      product.slug,
      `image-${formattedImageNumber}.${extension}`
    ].join("/");

  const newImageUrl =
    await uploadObjectToStorage(
      newObjectKey,
      file.buffer,
      file.mimetype
    );

  if (
    newObjectKey !==
    oldObjectKey
  ) {
    await deleteObjectFromStorage(
      oldObjectKey
    );
  }

  const updateData: {
    image_url: string;
    alt_text?: string | null;
    sort_order?: number;
  } = {
    image_url:
      newImageUrl
  };

  if (
    altText !== undefined
  ) {
    updateData.alt_text =
      altText;
  }

  if (
    sortOrder !== undefined
  ) {
    updateData.sort_order =
      sortOrder;
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
        updatedImage.sort_order,

      objectKey:
        newObjectKey
    }
  };
}