import { z } from "zod";

/**
 * Проверяет данные изменения профиля покупателя.
 */
export const updateProfileSchema =
  z.object({
    name:
      z.string()
        .trim()
        .min(
          2,
          "Имя должно содержать не менее 2 символов"
        )
        .max(
          255,
          "Имя слишком длинное"
        )
        .nullable()
        .optional(),

    email:
      z.string()
        .trim()
        .email(
          "Некорректный адрес электронной почты"
        )
        .max(
          320,
          "Адрес электронной почты слишком длинный"
        )
        .nullable()
        .optional(),

    username:
      z.string()
        .trim()
        .min(
          2,
          "Username должен содержать не менее 2 символов"
        )
        .max(
          100,
          "Username слишком длинный"
        )
        .nullable()
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

export type UpdateProfileInput =
  z.infer<
    typeof updateProfileSchema
  >;