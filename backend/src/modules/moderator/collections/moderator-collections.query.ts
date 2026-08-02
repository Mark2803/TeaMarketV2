import { z } from "zod";

/**
 * Параметры списка подборок модератора.
 */
export const moderatorCollectionsQuerySchema =
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

    showOnHome:
      z.enum([
        "true",
        "false"
      ])
        .transform(
          (value) =>
            value === "true"
        )
        .optional(),

    collectionType:
      z.enum([
        "manual",
        "automatic"
      ])
        .optional()
  });

export type ModeratorCollectionsQuery =
  z.infer<
    typeof moderatorCollectionsQuerySchema
  >;