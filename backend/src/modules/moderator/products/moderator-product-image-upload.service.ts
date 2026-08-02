import {
  prisma
} from "../../../database/prisma.js";

import {
  uploadObjectToStorage
} from "../../../lib/s3-upload.js";

export type UploadModeratorProductImageResult =
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
        "PRODUCT_NOT_FOUND";
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
 * Определяет следующий свободный номер изображения.
 */
function getNextImageNumber(
  imageUrls: string[]
): number {
  const usedNumbers =
    new Set<number>();

  for (
    const imageUrl
    of imageUrls
  ) {
    const match =
      imageUrl.match(
        /\/image-(\d+)\.(?:jpg|jpeg|png|webp)$/i
      );

    if (!match?.[1]) {
      continue;
    }

    const imageNumber =
      Number(match[1]);

    if (
      Number.isInteger(
        imageNumber
      )
      && imageNumber > 0
    ) {
      usedNumbers.add(
        imageNumber
      );
    }
  }

  let nextNumber = 1;

  while (
    usedNumbers.has(
      nextNumber
    )
  ) {
    nextNumber += 1;
  }

  return nextNumber;
}

/**
 * Загружает изображение в Object Storage
 * и создаёт запись в product_images.
 */
export async function uploadModeratorProductImage(
  productId: string,
  file: Express.Multer.File,
  altText: string | null,
  sortOrder: number
): Promise<UploadModeratorProductImageResult> {
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
          select: {
            image_url:
              true
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

  const extension =
    extensionByMimeType[
      file.mimetype
    ];

  if (!extension) {
    throw new Error(
      "Неподдерживаемый формат изображения"
    );
  }

  const nextImageNumber =
    getNextImageNumber(
      product.product_images.map(
        (image) =>
          image.image_url
      )
    );

  const formattedNumber =
    String(
      nextImageNumber
    ).padStart(
      2,
      "0"
    );

  const fileName =
    `image-${formattedNumber}.${extension}`;

  const objectKey =
    [
      "products",
      product.slug,
      fileName
    ].join("/");

  const imageUrl =
    await uploadObjectToStorage(
      objectKey,
      file.buffer,
      file.mimetype
    );

  const image =
    await prisma.product_images.create({
      data: {
        product_id:
          productId,

        image_url:
          imageUrl,

        alt_text:
          altText,

        sort_order:
          sortOrder
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
        image.sort_order,

      objectKey
    }
  };
}