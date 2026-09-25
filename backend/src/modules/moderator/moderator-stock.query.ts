import { z } from "zod";

/**
 * Параметры списка остатков.
 *
 * stockStatus:
 * - all — все варианты;
 * - low — остаток от 1 до lowStockThreshold;
 * - out — остаток 0.
 */
export const moderatorStockQuerySchema =
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

    stockStatus:
      z.enum([
        "all",
        "low",
        "out"
      ])
        .default("all"),

    lowStockThreshold:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(1000000)
        .default(5)
  });

export type ModeratorStockQuery =
  z.infer<
    typeof moderatorStockQuerySchema
  >;
