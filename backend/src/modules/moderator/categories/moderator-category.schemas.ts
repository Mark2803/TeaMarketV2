import { z } from "zod";

/**
 * Параметры маршрута категории.
 */
export const moderatorCategoryParamsSchema =
  z.object({
    categoryId:
      z.string()
        .uuid(
          "Некорректный ID категории"
        )
  });

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
 * Данные создания категории.
 */
export const createModeratorCategorySchema =
  z.object({
    parentCategoryId:
      z.string()
        .uuid(
          "Некорректный ID родительской категории"
        )
        .nullable()
        .optional(),

    name:
      z.string()
        .trim()
        .min(
          1,
          "Название категории обязательно"
        )
        .max(
          255,
          "Название категории слишком длинное"
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

    sortOrder:
      z.number()
        .int()
        .min(
          0,
          "Порядок сортировки не может быть отрицательным"
        )
        .default(0),

    isVisible:
      z.boolean()
        .default(true),

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
 * Данные редактирования категории.
 *
 * Отдельная схема без default нужна,
 * чтобы PATCH не сбрасывал отсутствующие поля.
 */
export const updateModeratorCategorySchema =
  z.object({
    parentCategoryId:
      z.string()
        .uuid(
          "Некорректный ID родительской категории"
        )
        .nullable()
        .optional(),

    name:
      z.string()
        .trim()
        .min(
          1,
          "Название категории обязательно"
        )
        .max(
          255,
          "Название категории слишком длинное"
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

    sortOrder:
      z.number()
        .int()
        .min(
          0,
          "Порядок сортировки не может быть отрицательным"
        )
        .optional(),

    isVisible:
      z.boolean()
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
  );

export type CreateModeratorCategoryInput =
  z.infer<
    typeof createModeratorCategorySchema
  >;

export type UpdateModeratorCategoryInput =
  z.infer<
    typeof updateModeratorCategorySchema
  >;