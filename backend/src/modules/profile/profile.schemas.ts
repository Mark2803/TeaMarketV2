import { z } from "zod";

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(32, "Номер телефона слишком длинный")
  .refine(
    (value) => value === "" || /^\+?[0-9 ()-]{7,32}$/.test(value),
    "Некорректный номер телефона"
  )
  .nullable()
  .optional();

const optionalTelegramSchema = z
  .string()
  .trim()
  .max(100, "Telegram username слишком длинный")
  .refine(
    (value) => value === "" || /^@?[A-Za-z0-9_]{5,32}$/.test(value),
    "Некорректный Telegram username"
  )
  .nullable()
  .optional();

/** Проверяет данные изменения профиля покупателя. */
export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Имя должно содержать не менее 2 символов")
      .max(255, "Имя слишком длинное")
      .nullable()
      .optional(),

    email: z
      .string()
      .trim()
      .email("Некорректный адрес электронной почты")
      .max(320, "Адрес электронной почты слишком длинный")
      .nullable()
      .optional(),

    phone: optionalPhoneSchema,
    username: optionalTelegramSchema,
    emailMarketing: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Не указаны данные для обновления"
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
