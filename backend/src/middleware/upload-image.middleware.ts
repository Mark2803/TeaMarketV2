import multer from "multer";

const MAX_IMAGE_SIZE_BYTES =
  10 * 1024 * 1024;

const allowedMimeTypes =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);

/**
 * Принимает одно изображение в память.
 *
 * Поле multipart/form-data:
 * image
 */
export const uploadProductImage =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        MAX_IMAGE_SIZE_BYTES
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      if (
        !allowedMimeTypes.has(
          file.mimetype
        )
      ) {
        callback(
          new Error(
            "Поддерживаются только JPEG, PNG и WEBP"
          )
        );

        return;
      }

      callback(
        null,
        true
      );
    }
  })
    .single("image");