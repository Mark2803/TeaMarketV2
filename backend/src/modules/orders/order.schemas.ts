import { z } from "zod";

function validPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^[+\d\s()\-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
}

/**
 * Проверяет токен гостевой корзины.
 */
export const guestOrderTokenSchema =
  z.string()
    .uuid(
      "Некорректный токен гостевой корзины"
    );

/**
 * Проверяет данные оформления заказа.
 */
export const createOrderSchema =
  z.object({
    customerName:
      z.string()
        .trim()
        .min(
          2,
          "Укажите имя покупателя"
        )
        .max(
          255,
          "Имя покупателя слишком длинное"
        ),

    phone:
      z.string()
        .trim()
        .min(
          10,
          "Укажите номер телефона"
        )
        .max(
          32,
          "Номер телефона слишком длинный"
        )
        .refine(validPhone, "Телефон должен содержать 10–15 цифр"),

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
        .optional()
        .or(
          z.literal("")
        ),

    comment:
      z.string()
        .trim()
        .max(
          2000,
          "Комментарий слишком длинный"
        )
        .optional(),

    deliveryMethodId:
      z.string()
        .uuid(
          "Некорректный способ доставки"
        ),

    delivery:
      z.object({
        recipientName:
          z.string()
            .trim()
            .min(
              2,
              "Укажите имя получателя"
            )
            .max(
              255,
              "Имя получателя слишком длинное"
            ),

        phone:
          z.string()
            .trim()
            .min(
              10,
              "Укажите телефон получателя"
            )
            .max(
              32,
              "Телефон получателя слишком длинный"
            )
            .refine(validPhone, "Телефон должен содержать 10–15 цифр"),

        fullAddress:
          z.string()
            .trim()
            .min(
              5,
              "Укажите адрес доставки"
            ),

        comment:
          z.string()
            .trim()
            .max(
              2000,
              "Комментарий к доставке слишком длинный"
            )
            .optional()
      }),

    promoCode: z.string().trim().max(100).optional(),

    referralCode: z.string().trim().max(100).optional(),

    loyaltyToSpend: z.coerce.number().min(0).default(0),

    paymentMethodId:
      z.string()
        .uuid(
          "Некорректный способ оплаты"
        )
  });

export type CreateOrderInput =
  z.infer<typeof createOrderSchema>;