import { z } from "zod";

/**
 * Параметры маршрута категории товара.
 */
export const moderatorProductCategoryParamsSchema =
  z.object({
    productId:
      z.string()
        .uuid(
          "Некорректный ID товара"
        ),

    categoryId:
      z.string()
        .uuid(
          "Некорректный ID категории"
        )
  });

/**
 * Данные привязки категории к товару.
 */
export const upsertModeratorProductCategorySchema =
  z.object({
    isPrimary:
      z.boolean()
        .default(false),

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
 * Данные изменения привязки категории.
 */
export const updateModeratorProductCategorySchema =
  z.object({
    isPrimary:
      z.boolean()
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

export type UpsertModeratorProductCategoryInput =
  z.infer<
    typeof upsertModeratorProductCategorySchema
  >;

export type UpdateModeratorProductCategoryInput =
  z.infer<
    typeof updateModeratorProductCategorySchema
  >;