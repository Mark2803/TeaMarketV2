import { z } from "zod";

import {
  productVariantStatusSchema
} from "./moderator-product.schemas.js";

/**
 * Параметры списка товаров модератора.
 */
export const moderatorProductsQuerySchema =
  z.object({
    page:
      z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),

    search:
      z.string()
        .trim()
        .min(1)
        .max(255)
        .optional(),

    isActive:
      z.enum([
        "true",
        "false"
      ])
        .transform(
          (value) =>
            value === "true"
        )
        .optional(),

    variantStatus:
      productVariantStatusSchema
        .optional()
  });

export type ModeratorProductsQuery =
  z.infer<
    typeof moderatorProductsQuerySchema
  >;