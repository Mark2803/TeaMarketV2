import { z } from "zod";

/**
 * Проверяет токен гостевой корзины.
 *
 * До появления авторизации корзина определяется
 * по UUID-токену гостя.
 */
export const guestCartTokenSchema =
  z.string()
    .uuid(
      "Некорректный токен гостевой корзины"
    );

/**
 * Проверяет параметры маршрута с ID позиции корзины.
 */
export const cartItemParamsSchema =
  z.object({
    itemId: z.string()
      .uuid(
        "Некорректный ID позиции корзины"
      )
  });

/**
 * Проверяет данные добавления товара в корзину.
 */
export const addCartItemSchema =
  z.object({
    productVariantId: z.string()
      .uuid(
        "Некорректный ID варианта товара"
      ),

    quantity: z.coerce
      .number()
      .int(
        "Количество должно быть целым числом"
      )
      .positive(
        "Количество должно быть больше нуля"
      )
      .default(1)
  });

/**
 * Проверяет данные изменения количества товара.
 */
export const updateCartItemSchema =
  z.object({
    quantity: z.coerce
      .number()
      .int(
        "Количество должно быть целым числом"
      )
      .positive(
        "Количество должно быть больше нуля"
      )
      .optional(),

    productVariantId: z.string()
      .uuid(
        "Некорректный ID варианта товара"
      )
      .optional()
  })
    .refine(
      (value) =>
        value.quantity !== undefined
        || value.productVariantId !== undefined,
      {
        message:
          "Необходимо передать количество или вариант товара"
      }
    );

export type AddCartItemInput =
  z.infer<typeof addCartItemSchema>;

export type UpdateCartItemInput =
  z.infer<typeof updateCartItemSchema>;

export type CartItemParams =
  z.infer<typeof cartItemParamsSchema>;