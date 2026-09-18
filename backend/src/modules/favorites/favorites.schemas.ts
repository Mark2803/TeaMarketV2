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
export const favoriteProductIdsBodySchema = z.object({
  productIds: z.array(z.string().uuid("Некорректный ID товара")).max(200)
});
