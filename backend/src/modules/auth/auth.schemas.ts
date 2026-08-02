import { z } from "zod";

/**
 * Нормализует номер телефона:
 * оставляет только цифры и ведущий знак +.
 */
function normalizePhone(
  value: string
) {
  const trimmed =
    value.trim();

  const hasPlus =
    trimmed.startsWith("+");

  const digits =
    trimmed.replace(
      /\D/g,
      ""
    );

  return hasPlus
    ? `+${digits}`
    : digits;
}

/**
 * Проверяет номер телефона для авторизации.
 */
export const phoneSchema =
  z.string()
    .trim()
    .transform(
      normalizePhone
    )
    .refine(
      (phone) =>
        /^\+?\d{10,15}$/.test(
          phone
        ),
      {
        message:
          "Некорректный номер телефона"
      }
    );

/**
 * Запрос одноразового кода.
 */
export const requestAuthCodeSchema =
  z.object({
    phone:
      phoneSchema
  });

/**
 * Проверка одноразового кода.
 */
export const verifyAuthCodeSchema =
  z.object({
    phone:
      phoneSchema,

    code:
      z.string()
        .trim()
        .regex(
          /^\d{6}$/,
          "Код должен состоять из 6 цифр"
        )
  });

/**
 * Проверяет токен пользовательской сессии.
 */
export const sessionTokenSchema =
  z.string()
    .trim()
    .min(
      32,
      "Некорректный токен сессии"
    )
    .max(
      512,
      "Некорректный токен сессии"
    );

export type RequestAuthCodeInput =
  z.infer<
    typeof requestAuthCodeSchema
  >;

export type VerifyAuthCodeInput =
  z.infer<
    typeof verifyAuthCodeSchema
  >;