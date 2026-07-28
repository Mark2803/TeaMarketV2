import { z } from "zod";

export const productsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  sort: z
    .enum([
      "newest",
      "name-asc",
      "name-desc"
    ])
    .default("newest"),

  teaType: z
    .string()
    .trim()
    .min(1)
    .optional(),

  country: z
    .string()
    .trim()
    .min(1)
    .optional(),

  region: z
    .string()
    .trim()
    .min(1)
    .optional(),

  manufacturer: z
    .string()
    .trim()
    .min(1)
    .optional(),

  minPrice: z.coerce
    .number()
    .nonnegative()
    .optional(),

  maxPrice: z.coerce
    .number()
    .nonnegative()
    .optional(),

  inStock: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
}).refine(
  (data) => {
    if (
      data.minPrice !== undefined &&
      data.maxPrice !== undefined
    ) {
      return data.minPrice <= data.maxPrice;
    }

    return true;
  },
  {
    message:
      "Минимальная цена не может быть больше максимальной",
    path: ["minPrice"]
  }
);

export type ProductsQuery =
  z.infer<typeof productsQuerySchema>;