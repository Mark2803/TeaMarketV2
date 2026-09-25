import { z } from "zod";

const nullableDate = z.union([z.coerce.date(), z.null()]).optional();

const promotionBaseSchema = z.object({
  name: z.string().trim().min(2, "Название слишком короткое").max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  discountType: z.enum(["percent", "fixed", "free_delivery", "buy_x_get_y"]),
  scope: z.enum(["order", "product", "category", "collection"]).default("order"),
  targetIds: z.array(z.string().uuid()).default([]),
  value: z.coerce.number().min(0),
  buyQuantity: z.coerce.number().int().min(1).nullable().optional(),
  getQuantity: z.coerce.number().int().min(1).nullable().optional(),
  minOrderAmount: z.coerce.number().min(0).default(0),
  priority: z.coerce.number().int().default(0),
  audienceType: z.enum(["all", "registered", "guests", "customers"]).default("all"),
  customerIds: z.array(z.string().uuid()).default([]),
  activationType: z.enum(["automatic", "promo_code"]).default("automatic"),
  promoCodeId: z.string().uuid().nullable().optional(),
  isStackable: z.boolean().default(false),
  usageLimit: z.coerce.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  startsAt: nullableDate,
  endsAt: nullableDate,
});

function validatePromotion(
  value: {
    name?: string | undefined;
    description?: string | null | undefined;
    discountType?: "percent" | "fixed" | "free_delivery" | "buy_x_get_y" | undefined;
    scope?: "order" | "product" | "category" | "collection" | undefined;
    targetIds?: string[] | undefined;
    value?: number | undefined;
    buyQuantity?: number | null | undefined;
    getQuantity?: number | null | undefined;
    minOrderAmount?: number | undefined;
    priority?: number | undefined;
    audienceType?: "all" | "registered" | "guests" | "customers" | undefined;
    customerIds?: string[] | undefined;
    activationType?: "automatic" | "promo_code" | undefined;
    promoCodeId?: string | null | undefined;
    isStackable?: boolean | undefined;
    usageLimit?: number | null | undefined;
    perCustomerLimit?: number | undefined;
    isActive?: boolean | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
  },
  ctx: z.RefinementCtx,
) {
  if (value.discountType === "percent" && value.value !== undefined && value.value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Процент скидки не может быть больше 100" });
  }
  if (value.discountType === "buy_x_get_y" && value.scope === "order") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scope"], message: "Для N+M выберите товары, категорию или подборку" });
  }
  if (value.scope && value.scope !== "order" && (!value.targetIds || value.targetIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["targetIds"], message: "Выберите хотя бы одну цель акции" });
  }
  if (value.discountType === "buy_x_get_y" && (!value.buyQuantity || !value.getQuantity)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["buyQuantity"], message: "Для N+M укажите количество покупаемых и бесплатных единиц" });
  }
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Дата окончания должна быть позже даты начала" });
  }
}

export const promotionInputSchema = promotionBaseSchema.superRefine(validatePromotion);
export const promotionUpdateSchema = promotionBaseSchema.partial().superRefine(validatePromotion);

const promoCodeBaseSchema = z.object({
  code: z.string().trim().min(2).max(100).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(255),
  discountType: z.enum(["percent", "fixed", "free_delivery"]),
  value: z.coerce.number().min(0),
  minOrderAmount: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  startsAt: nullableDate,
  endsAt: nullableDate,
});

function validatePromoCode(
  value: {
    code?: string | undefined;
    name?: string | undefined;
    discountType?: "percent" | "fixed" | "free_delivery" | undefined;
    value?: number | undefined;
    minOrderAmount?: number | undefined;
    usageLimit?: number | null | undefined;
    perCustomerLimit?: number | undefined;
    isActive?: boolean | undefined;
    startsAt?: Date | null | undefined;
    endsAt?: Date | null | undefined;
  },
  ctx: z.RefinementCtx,
) {
  if (value.discountType === "percent" && value.value !== undefined && value.value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Процент скидки не может быть больше 100" });
  }
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Дата окончания должна быть позже даты начала" });
  }
}

export const promoCodeInputSchema = promoCodeBaseSchema.superRefine(validatePromoCode);
export const promoCodeUpdateSchema = promoCodeBaseSchema.partial().superRefine(validatePromoCode);

export const loyaltySettingsSchema = z.object({
  isActive: z.boolean(),
  earnPercent: z.coerce.number().min(0).max(100),
  maxSpendPercent: z.coerce.number().min(0).max(100),
  minOrderAmount: z.coerce.number().min(0),
  bonusLifetimeDays: z.coerce.number().int().min(1).nullable().optional(),
  minSpendPoints: z.coerce.number().min(0),
  allowWithPromotions: z.boolean(),
  allowWithPromoCodes: z.boolean(),
});

export const referralPartnerSchema = z.object({
  name: z.string().trim().min(2).max(255),
  contact: z.string().trim().max(500).nullable().optional(),
  code: z.string().trim().min(2).max(100).transform(v => v.toUpperCase()),
  inviteeDiscountPercent: z.coerce.number().min(0).max(100),
  commissionPercent: z.coerce.number().min(0).max(100),
  minOrderAmount: z.coerce.number().min(0),
  isActive: z.boolean(),
});
export const referralPartnerUpdateSchema = referralPartnerSchema.partial();

export const referralSettingsSchema = z.object({
  isActive: z.boolean(),
  inviterBonus: z.coerce.number().min(0),
  inviteeDiscountPercent: z.coerce.number().min(0).max(100),
  minOrderAmount: z.coerce.number().min(0),
});
