import { z } from "zod";

/**
 * Параметры списка категорий модератора.
 */
export const moderatorCategoriesQuerySchema =
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

    isVisible:
      z.enum([
        "true",
        "false"
      ])
        .transform(
          (value) =>
            value === "true"
        )
        .optional(),

    parentCategoryId:
      z.union([
        z.string().uuid(
          "Некорректный ID родительской категории"
        ),
        z.literal("null")
      ])
        .transform(
          (value) =>
            value === "null"
              ? null
              : value
        )
        .optional()
  });

export type ModeratorCategoriesQuery =
  z.infer<
    typeof moderatorCategoriesQuerySchema
  >;