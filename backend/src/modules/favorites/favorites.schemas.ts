import { z } from "zod";

/**
 * Проверяет ID товара в маршрутах избранного.
 */
export const favoriteProductParamsSchema =
  z.object({
    productId:
      z.string()
        .uuid(
          "Некорректный ID товара"
        )
  });

export type FavoriteProductParams =
  z.infer<
    typeof favoriteProductParamsSchema
  >;