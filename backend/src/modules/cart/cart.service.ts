import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  AddCartItemInput,
  UpdateCartItemInput
} from "./cart.schemas.js";

const cartInclude = {
  cart_items: {
    orderBy: {
      created_at: "asc" as const
    },

    include: {
      product_variants: {
        include: {
          products: {
            include: {
              product_images: {
                orderBy: {
                  sort_order: "asc" as const
                },

                take: 1
              }
            }
          }
        }
      }
    }
  }
} satisfies Prisma.cartsInclude;

type CartWithItems =
  Prisma.cartsGetPayload<{
    include: typeof cartInclude;
  }>;

export type CartOperationError =
  | "PRODUCT_VARIANT_NOT_FOUND"
  | "CART_ITEM_NOT_FOUND"
  | "INSUFFICIENT_STOCK";

export type CartOperationResult =
  | {
      success: true;
      cart: ReturnType<
        typeof formatCart
      >;
    }
  | {
      success: false;
      error: CartOperationError;
      availableQuantity?: number;
    };

/**
 * Приводит корзину к формату ответа API.
 */
function formatCart(
  cart: CartWithItems
) {
  const items =
    cart.cart_items.map(
      (item) => {
        const variant =
          item.product_variants;

        const product =
          variant.products;

        const unitPrice =
          Number(
            item.price_at_addition
          );

        const lineTotal =
          unitPrice * item.quantity;

        return {
          id: item.id,

          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,

            image:
              product.product_images[0]
                ?? null
          },

          variant: {
            id: variant.id,
            sku: variant.sku,
            weightG: variant.weight_g,
            price: variant.price,
            oldPrice: variant.old_price,
            stockQuantity:
              variant.stock_quantity,
            isAvailable:
              variant.is_available
          },

          quantity:
            item.quantity,

          priceAtAddition:
            item.price_at_addition,

          lineTotal:
            lineTotal.toFixed(2)
        };
      }
    );

  const totalAmount =
    items.reduce(
      (sum, item) =>
        sum + Number(item.lineTotal),
      0
    );

  const totalQuantity =
    items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  return {
    id: cart.id,
    guestToken: cart.guest_token,
    status: cart.status,
    items,
    totalQuantity,
    totalAmount:
      totalAmount.toFixed(2),
    createdAt: cart.created_at,
    updatedAt: cart.updated_at
  };
}

/**
 * Получает существующую гостевую корзину
 * или создаёт новую пустую корзину.
 */
async function getOrCreateGuestCart(
  guestToken: string
) {
  return prisma.carts.upsert({
    where: {
      guest_token: guestToken
    },

    update: {
      status: "active"
    },

    create: {
      guest_token: guestToken,
      status: "active"
    },

    include: cartInclude
  });
}

/**
 * Получает гостевую корзину.
 */
export async function getGuestCart(
  guestToken: string
) {
  const cart =
    await getOrCreateGuestCart(
      guestToken
    );

  return formatCart(cart);
}

/**
 * Добавляет вариант товара в корзину.
 *
 * Если такой вариант уже есть,
 * увеличивает его количество.
 */
export async function addGuestCartItem(
  guestToken: string,
  input: AddCartItemInput
): Promise<CartOperationResult> {
  return prisma.$transaction(
    async (transaction) => {
      const variant =
        await transaction
          .product_variants
          .findFirst({
            where: {
              id:
                input.productVariantId,

              status: "active",
              is_available: true,

              products: {
                is_active: true
              }
            }
          });

      if (!variant) {
        return {
          success: false,
          error:
            "PRODUCT_VARIANT_NOT_FOUND"
        };
      }

      const cart =
        await transaction.carts.upsert({
          where: {
            guest_token: guestToken
          },

          update: {
            status: "active"
          },

          create: {
            guest_token: guestToken,
            status: "active"
          }
        });

      const existingItem =
        await transaction
          .cart_items
          .findUnique({
            where: {
              cart_id_product_variant_id: {
                cart_id: cart.id,

                product_variant_id:
                  variant.id
              }
            }
          });

      const newQuantity =
        (existingItem?.quantity ?? 0)
        + input.quantity;

      if (
        newQuantity >
        variant.stock_quantity
      ) {
        return {
          success: false,
          error:
            "INSUFFICIENT_STOCK",
          availableQuantity:
            variant.stock_quantity
        };
      }

      if (existingItem) {
        await transaction
          .cart_items
          .update({
            where: {
              id: existingItem.id
            },

            data: {
              quantity: newQuantity,
              price_at_addition:
                variant.price
            }
          });
      } else {
        await transaction
          .cart_items
          .create({
            data: {
              cart_id: cart.id,

              product_variant_id:
                variant.id,

              quantity:
                input.quantity,

              price_at_addition:
                variant.price
            }
          });
      }

      const updatedCart =
        await transaction
          .carts
          .findUniqueOrThrow({
            where: {
              id: cart.id
            },

            include: cartInclude
          });

      return {
        success: true,
        cart:
          formatCart(updatedCart)
      };
    }
  );
}

/**
 * Изменяет количество позиции корзины.
 */
export async function updateGuestCartItem(
  guestToken: string,
  itemId: string,
  input: UpdateCartItemInput
): Promise<CartOperationResult> {
  return prisma.$transaction(
    async (transaction) => {
      const item =
        await transaction
          .cart_items
          .findFirst({
            where: {
              id: itemId,

              carts: {
                guest_token: guestToken,
                status: "active"
              }
            },

            include: {
              product_variants: true
            }
          });

      if (!item) {
        return {
          success: false,
          error:
            "CART_ITEM_NOT_FOUND"
        };
      }

      const variant =
        item.product_variants;

      if (
        variant.status !== "active"
        || !variant.is_available
      ) {
        return {
          success: false,
          error:
            "PRODUCT_VARIANT_NOT_FOUND"
        };
      }

      if (
        input.quantity >
        variant.stock_quantity
      ) {
        return {
          success: false,
          error:
            "INSUFFICIENT_STOCK",
          availableQuantity:
            variant.stock_quantity
        };
      }

      await transaction
        .cart_items
        .update({
          where: {
            id: item.id
          },

          data: {
            quantity:
              input.quantity
          }
        });

      const updatedCart =
        await transaction
          .carts
          .findUniqueOrThrow({
            where: {
              id: item.cart_id
            },

            include: cartInclude
          });

      return {
        success: true,
        cart:
          formatCart(updatedCart)
      };
    }
  );
}

/**
 * Удаляет позицию из корзины.
 */
export async function removeGuestCartItem(
  guestToken: string,
  itemId: string
): Promise<CartOperationResult> {
  return prisma.$transaction(
    async (transaction) => {
      const item =
        await transaction
          .cart_items
          .findFirst({
            where: {
              id: itemId,

              carts: {
                guest_token: guestToken,
                status: "active"
              }
            }
          });

      if (!item) {
        return {
          success: false,
          error:
            "CART_ITEM_NOT_FOUND"
        };
      }

      await transaction
        .cart_items
        .delete({
          where: {
            id: item.id
          }
        });

      const updatedCart =
        await transaction
          .carts
          .findUniqueOrThrow({
            where: {
              id: item.cart_id
            },

            include: cartInclude
          });

      return {
        success: true,
        cart:
          formatCart(updatedCart)
      };
    }
  );
}