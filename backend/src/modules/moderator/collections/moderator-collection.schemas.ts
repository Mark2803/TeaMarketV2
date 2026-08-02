import { z } from "zod";

/**
 * Параметры маршрута подборки.
 */
export const moderatorCollectionParamsSchema =
  z.object({
    collectionId:
      z.string()
        .uuid(
          "Некорректный ID подборки"
        )
  });

/**
 * Тип подборки.
 */
export const moderatorCollectionTypeSchema =
  z.enum([
    "manual",
    "automatic"
  ]);

/**
 * Нормализует пустую строку в null.
 */
const nullableText =
  (maxLength?: number) => {
    let schema =
      z.string()
        .trim();

    if (maxLength !== undefined) {
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
 * Данные создания подборки.
 */
export const createModeratorCollectionSchema =
  z.object({
    name:
      z.string()
        .trim()
        .min(
          1,
          "Название подборки обязательно"
        )
        .max(
          255,
          "Название подборки слишком длинное"
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

    description:
      nullableText(),

    imageUrl:
      z.string()
        .trim()
        .url(
          "Некорректный URL изображения"
        )
        .nullable()
        .optional(),

    collectionType:
      moderatorCollectionTypeSchema
        .default("manual"),

    automationRules:
      z.record(
        z.string(),
        z.unknown()
      )
        .nullable()
        .optional(),

    isActive:
      z.boolean()
        .default(true),

    showOnHome:
      z.boolean()
        .default(false),

    startsAt:
      z.coerce
        .date()
        .nullable()
        .optional(),

    endsAt:
      z.coerce
        .date()
        .nullable()
        .optional(),

    sortOrder:
      z.number()
        .int()
        .min(
          0,
          "Порядок сортировки не может быть отрицательным"
        )
        .default(0),

    seoTitle:
      nullableText(255),

    seoDescription:
      nullableText(),

    canonicalUrl:
      nullableText(),

    isIndexed:
      z.boolean()
        .default(true)
  })
  .superRefine(
    (data, context) => {
      if (
        data.collectionType ===
          "automatic"
        && data.automationRules == null
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "automationRules"
          ],

          message:
            "Для автоматической подборки обязательны правила автоматизации"
        });
      }

      if (
        data.startsAt
        && data.endsAt
        && data.startsAt >= data.endsAt
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "endsAt"
          ],

          message:
            "Дата окончания должна быть позже даты начала"
        });
      }
    }
  );

/**
 * Данные редактирования подборки.
 */
export const updateModeratorCollectionSchema =
  z.object({
    name:
      z.string()
        .trim()
        .min(
          1,
          "Название подборки обязательно"
        )
        .max(
          255,
          "Название подборки слишком длинное"
        )
        .optional(),

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
        )
        .optional(),

    description:
      nullableText(),

    imageUrl:
      z.string()
        .trim()
        .url(
          "Некорректный URL изображения"
        )
        .nullable()
        .optional(),

    collectionType:
      moderatorCollectionTypeSchema
        .optional(),

    automationRules:
      z.record(
        z.string(),
        z.unknown()
      )
        .nullable()
        .optional(),

    isActive:
      z.boolean()
        .optional(),

    showOnHome:
      z.boolean()
        .optional(),

    startsAt:
      z.coerce
        .date()
        .nullable()
        .optional(),

    endsAt:
      z.coerce
        .date()
        .nullable()
        .optional(),

    sortOrder:
      z.number()
        .int()
        .min(
          0,
          "Порядок сортировки не может быть отрицательным"
        )
        .optional(),

    seoTitle:
      nullableText(255),

    seoDescription:
      nullableText(),

    canonicalUrl:
      nullableText(),

    isIndexed:
      z.boolean()
        .optional()
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "Не указаны данные для обновления"
    }
  )
  .superRefine(
    (data, context) => {
      if (
        data.startsAt
        && data.endsAt
        && data.startsAt >= data.endsAt
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "endsAt"
          ],

          message:
            "Дата окончания должна быть позже даты начала"
        });
      }
    }
  );

export type CreateModeratorCollectionInput =
  z.infer<
    typeof createModeratorCollectionSchema
  >;

export type UpdateModeratorCollectionInput =
  z.infer<
    typeof updateModeratorCollectionSchema
  >;