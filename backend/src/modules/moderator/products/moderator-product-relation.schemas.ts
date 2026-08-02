import { z } from "zod";

/**
 * Допустимые типы связи между товарами.
 */
export const moderatorProductRelationTypeSchema =
  z.enum([
    "related",
    "similar"
  ]);

/**
 * Параметры маршрута.
 */
export const moderatorProductRelationParamsSchema =
  z.object({
    productId:
      z.string().uuid(
        "Некорректный ID товара"
      ),

    relatedProductId:
      z.string().uuid(
        "Некорректный ID связанного товара"
      )
  });

/**
 * Создание связи.
 */
export const upsertModeratorProductRelationSchema =
  z.object({
    relationType:
      moderatorProductRelationTypeSchema,

    sortOrder:
      z.number()
        .int()
        .min(0)
        .default(0)
  });

/**
 * Обновление связи.
 */
export const updateModeratorProductRelationSchema =
  z.object({
    relationType:
      moderatorProductRelationTypeSchema.optional(),

    sortOrder:
      z.number()
        .int()
        .min(0)
        .optional()
  }).refine(
    (value) =>
      value.relationType !== undefined ||
      value.sortOrder !== undefined,
    {
      message:
        "Не указаны данные для обновления"
    }
  );

export type UpsertModeratorProductRelationInput =
  z.infer<
    typeof upsertModeratorProductRelationSchema
  >;

export type UpdateModeratorProductRelationInput =
  z.infer<
    typeof updateModeratorProductRelationSchema
  >;