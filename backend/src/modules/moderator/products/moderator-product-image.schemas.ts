import { z } from "zod";

/**
 * Параметры маршрута изображения товара.
 */
export const moderatorProductImageParamsSchema =
  z.object({
    productId:
      z.string()
        .uuid(
          "Некорректный ID товара"
        ),

    imageId:
      z.string()
        .uuid(
          "Некорректный ID изображения"
        )
  });

/**
 * Данные добавления изображения товара.
 *
 * Главное изображение определяется минимальным sortOrder.
 * Обычно для него используется sortOrder = 0.
 */
export const createModeratorProductImageSchema =
  z.object({
    imageUrl:
      z.string()
        .trim()
        .min(
          1,
          "URL изображения обязателен"
        )
        .url(
          "Некорректный URL изображения"
        ),

    altText:
      z.string()
        .trim()
        .max(
          500,
          "Alt-текст не должен превышать 500 символов"
        )
        .nullable()
        .optional(),

    sortOrder:
      z.number()
        .int()
        .min(
          0,
          "Порядок сортировки не может быть отрицательным"
        )
        .default(0)
  });

/**
 * Данные редактирования изображения товара.
 */
export const updateModeratorProductImageSchema =
  z.object({
    imageUrl:
      z.string()
        .trim()
        .min(
          1,
          "URL изображения обязателен"
        )
        .url(
          "Некорректный URL изображения"
        )
        .optional(),

    altText:
      z.string()
        .trim()
        .max(
          500,
          "Alt-текст не должен превышать 500 символов"
        )
        .nullable()
        .optional(),

    sortOrder:
      z.number()
        .int()
        .min(
          0,
          "Порядок сортировки не может быть отрицательным"
        )
        .optional()
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "Не указаны данные для обновления"
    }
  );

export type CreateModeratorProductImageInput =
  z.infer<
    typeof createModeratorProductImageSchema
  >;

export type UpdateModeratorProductImageInput =
  z.infer<
    typeof updateModeratorProductImageSchema
  >;