import { z } from "zod";

/**
 * Нормализует пустую строку в null.
 */
const nullableText =
  (maxLength?: number) => {
    let schema =
      z.string()
        .trim();

    if (maxLength) {
      schema =
        schema.max(
          maxLength,
          "Значение слишком длинное"
        );
    }

    return schema
      .transform(
        (value) =>
          value === ""
            ? null
            : value
      )
      .nullable()
      .optional();
  };

/**
 * Допустимые статусы варианта товара.
 */
export const productVariantStatusSchema =
  z.enum([
    "active",
    "hidden",
    "archived"
  ]);

/**
 * Данные создания товара.
 */
export const createModeratorProductSchema =
  z.object({
    name:
      z.string()
        .trim()
        .min(
          1,
          "Название товара обязательно"
        )
        .max(
          255,
          "Название товара слишком длинное"
        ),

    slug:
      z.string()
        .trim()
        .min(
          1,
          "Slug обязателен"
        )
        .max(
          255,
          "Slug слишком длинный"
        )
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Slug может содержать только латинские буквы, цифры и дефисы"
        ),

    shortDescription:
      nullableText(),

    isActive:
      z.boolean()
        .default(true),

    teaType:
      nullableText(100),

    country:
      nullableText(100),

    region:
      nullableText(150),

    manufacturer:
      nullableText(255),

    fermentationLevel:
      nullableText(100),

    productForm:
      nullableText(100),

    aboutTea:
      nullableText(),

    taste:
      nullableText(),

    aroma:
      nullableText(),

    effect:
      nullableText(),

    beneficialProperties:
      nullableText(),

    waterTemperatureC:
      z.number()
        .int()
        .min(0)
        .max(100)
        .nullable()
        .optional(),

    teaAmountG:
      z.number()
        .positive()
        .nullable()
        .optional(),

    brewingTimeSeconds:
      z.number()
        .int()
        .positive()
        .nullable()
        .optional(),

    infusionCount:
      z.number()
        .int()
        .min(0)
        .nullable()
        .optional(),

    brewingTips:
      nullableText(),

    seoTitle:
      nullableText(255),

    seoDescription:
      nullableText(),

    canonicalUrl:
      nullableText(),

    isIndexed:
      z.boolean()
        .default(true)
  });

/**
 * Данные редактирования товара.
 */
export const updateModeratorProductSchema =
  createModeratorProductSchema
    .partial()
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      {
        message:
          "Не указаны данные для обновления"
      }
    );

/**
 * Поля создания варианта товара.
 */
const createModeratorProductVariantBaseSchema =
  z.object({
    sku:
      z.string()
        .trim()
        .min(
          1,
          "SKU обязателен"
        )
        .max(
          100,
          "SKU слишком длинный"
        ),

    weightG:
      z.number()
        .positive(),

    price:
      z.number()
        .min(0),

    oldPrice:
      z.number()
        .positive()
        .nullable()
        .optional(),

    stockQuantity:
      z.number()
        .int()
        .min(0)
        .default(0),

    sortOrder:
      z.number()
        .int()
        .min(0)
        .default(0),

    isAvailable:
      z.boolean()
        .default(true),

    status:
      productVariantStatusSchema
        .default("active")
  });

/**
 * Данные создания варианта товара.
 */
export const createModeratorProductVariantSchema =
  createModeratorProductVariantBaseSchema
    .refine(
      (data) =>
        data.oldPrice === null
        || data.oldPrice === undefined
        || data.oldPrice > data.price,
      {
        path: [
          "oldPrice"
        ],

        message:
          "Старая цена должна быть больше текущей"
      }
    );

/**
 * Поля обновления варианта без значений по умолчанию.
 *
 * Отдельная схема нужна, чтобы PATCH не сбрасывал
 * остаток, сортировку, доступность и статус.
 */
const updateModeratorProductVariantBaseSchema =
  z.object({
    sku:
      z.string()
        .trim()
        .min(
          1,
          "SKU обязателен"
        )
        .max(
          100,
          "SKU слишком длинный"
        )
        .optional(),

    weightG:
      z.number()
        .positive()
        .optional(),

    price:
      z.number()
        .min(0)
        .optional(),

    oldPrice:
      z.number()
        .positive()
        .nullable()
        .optional(),

    stockQuantity:
      z.number()
        .int()
        .min(0)
        .optional(),

    sortOrder:
      z.number()
        .int()
        .min(0)
        .optional(),

    isAvailable:
      z.boolean()
        .optional(),

    status:
      productVariantStatusSchema
        .optional()
  });

/**
 * Данные редактирования варианта товара.
 */
export const updateModeratorProductVariantSchema =
  updateModeratorProductVariantBaseSchema
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code:
              "custom",

            message:
              "Не указаны данные для обновления"
          });

          return;
        }

        if (
          data.price !== undefined
          && data.oldPrice !== undefined
          && data.oldPrice !== null
          && data.oldPrice <= data.price
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "oldPrice"
            ],

            message:
              "Старая цена должна быть больше текущей"
          });
        }
      }
    );

export const moderatorProductParamsSchema =
  z.object({
    productId:
      z.string()
        .uuid(
          "Некорректный ID товара"
        )
  });

export const moderatorVariantParamsSchema =
  z.object({
    productId:
      z.string()
        .uuid(
          "Некорректный ID товара"
        ),

    variantId:
      z.string()
        .uuid(
          "Некорректный ID варианта"
        )
  });

export type CreateModeratorProductInput =
  z.infer<
    typeof createModeratorProductSchema
  >;

export type UpdateModeratorProductInput =
  z.infer<
    typeof updateModeratorProductSchema
  >;

export type CreateModeratorProductVariantInput =
  z.infer<
    typeof createModeratorProductVariantSchema
  >;

export type UpdateModeratorProductVariantInput =
  z.infer<
    typeof updateModeratorProductVariantSchema
  >;