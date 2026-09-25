import { z } from "zod";

const nullableText = (max?: number) => {
  let s = z.string().trim();
  if (max) s = s.max(max);

  return s
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
};

export const homeBannerParamsSchema = z.object({
  bannerId: z.string().uuid(),
});

const homeBannerBaseSchema = z.object({
  collectionId: z.string().uuid(),
  eyebrow: nullableText(120),
  title: z.string().trim().min(1).max(255),
  subtitle: nullableText(),
  imageUrl: z.string().trim().url().nullable().optional(),
  imageAlt: nullableText(500),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

const validateBannerDates = (
  value: {
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
  },
  ctx: z.RefinementCtx,
) => {
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "Дата окончания должна быть позже даты начала",
    });
  }
};

export const homeBannerInputSchema =
  homeBannerBaseSchema.superRefine(validateBannerDates);

export const homeBannerUpdateSchema = homeBannerBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Нет данных для обновления",
      });
    }

    validateBannerDates(value, ctx);
  });

export const articleParamsSchema = z.object({
  articleId: z.string().uuid(),
});

const articleBaseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(255),
  excerpt: z.string().trim().min(1),
  content: z.string().trim().min(1),
  coverUrl: z.string().trim().url().nullable().optional(),
  coverAlt: nullableText(500),
  readingTimeMinutes: z.number().int().min(1).default(5),
  status: z.enum(["draft", "published"]).default("draft"),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  publishedAt: z.coerce.date().nullable().optional(),
  seoTitle: nullableText(255),
  seoDescription: nullableText(),
});

export const articleInputSchema = articleBaseSchema;

export const articleUpdateSchema = articleBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Нет данных для обновления",
  });
