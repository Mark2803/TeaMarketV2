import { z } from "zod";

/**
 * Параметры маршрута подборки товара.
 */
export const moderatorProductCollectionParamsSchema =
  z.object({
    productId:
      z.string().uuid(
        "Некорректный ID товара"
      ),

    collectionId:
      z.string().uuid(
        "Некорректный ID подборки"
      )
  });

/**
 * Добавление товара в подборку.
 */
export const upsertModeratorProductCollectionSchema =
  z.object({
    sortOrder:
      z.number()
        .int()
        .min(0)
        .default(0)
  });

/**
 * Обновление порядка товара.
 */
export const updateModeratorProductCollectionSchema =
  z.object({
    sortOrder:
      z.number()
        .int()
        .min(0)
  });

export type UpsertModeratorProductCollectionInput =
  z.infer<
    typeof upsertModeratorProductCollectionSchema
  >;

export type UpdateModeratorProductCollectionInput =
  z.infer<
    typeof updateModeratorProductCollectionSchema
  >;