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
              },

              product_variants: {
                where: {
                  status: "active"
                },

                orderBy: {
                  weight_g: "asc" as const
                }
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

type CartOwner =
  | {
      customerId: string;
      guestToken?: never;
    }
  | {
      customerId?: never;
      guestToken: string;
    };

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
            shortDescription:
              product.short_description,

            image:
              product.product_images[0]
                ?? null,

            variants:
              product.product_variants.map(
                (productVariant) => ({
                  id: productVariant.id,
                  sku: productVariant.sku,
                  weightG:
                    productVariant.weight_g,
                  price:
                    productVariant.price,
                  oldPrice:
                    productVariant.old_price,
                  stockQuantity:
                    productVariant.stock_quantity,
                  isAvailable:
                    productVariant.is_available
                })
              )
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
    customerId: cart.customer_id,
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

function ownerCartWhere(
  owner: CartOwner
): Prisma.cartsWhereInput {
  return "customerId" in owner
    ? {
        customer_id:
          owner.customerId,
        status: "active"
      }
    : {
        guest_token:
          owner.guestToken,
        status: "active"
      };
}

async function getOrCreateCart(
  client:
    | typeof prisma
    | Prisma.TransactionClient,
  owner: CartOwner,
  includeItems = true
) {
  if ("customerId" in owner) {
    const existingCart =
      await client.carts.findFirst({
        where: {
          customer_id:
            owner.customerId,
          status: "active"
        },
        orderBy: {
          updated_at: "desc"
        },
        ...(includeItems
          ? { include: cartInclude }
          : {})
      });

    if (existingCart) {
      return existingCart;
    }

    return client.carts.create({
      data: {
        customer_id:
          owner.customerId,
        status: "active"
      },
      ...(includeItems
        ? { include: cartInclude }
        : {})
    });
  }

  return client.carts.upsert({
    where: {
      guest_token:
        owner.guestToken
    },
    update: {
      status: "active"
    },
    create: {
      guest_token:
        owner.guestToken,
      status: "active"
    },
    ...(includeItems
      ? { include: cartInclude }
      : {})
  });
}

export async function getCart(
  owner: CartOwner
) {
  const cart =
    await getOrCreateCart(
      prisma,
      owner,
      true
    ) as CartWithItems;

  return formatCart(cart);
}

export async function addCartItem(
  owner: CartOwner,
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
        await getOrCreateCart(
          transaction,
          owner,
          false
        );

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

export async function updateCartItem(
  owner: CartOwner,
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
              carts:
                ownerCartWhere(owner)
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

      const targetVariantId =
        input.productVariantId
        ?? item.product_variant_id;

      const targetVariant =
        await transaction
          .product_variants
          .findFirst({
            where: {
              id: targetVariantId,
              status: "active",
              is_available: true,
              products: {
                is_active: true
              }
            }
          });

      if (
        !targetVariant
        || targetVariant.product_id
          !== item.product_variants.product_id
      ) {
        return {
          success: false,
          error:
            "PRODUCT_VARIANT_NOT_FOUND"
        };
      }

      const requestedQuantity =
        input.quantity
        ?? item.quantity;

      const existingTargetItem =
        targetVariantId
        === item.product_variant_id
          ? null
          : await transaction
              .cart_items
              .findUnique({
                where: {
                  cart_id_product_variant_id: {
                    cart_id: item.cart_id,
                    product_variant_id:
                      targetVariantId
                  }
                }
              });

      const finalQuantity =
        requestedQuantity
        + (existingTargetItem?.quantity ?? 0);

      if (
        finalQuantity >
        targetVariant.stock_quantity
      ) {
        return {
          success: false,
          error:
            "INSUFFICIENT_STOCK",
          availableQuantity:
            targetVariant.stock_quantity
        };
      }

      if (existingTargetItem) {
        await transaction
          .cart_items
          .update({
            where: {
              id: existingTargetItem.id
            },
            data: {
              quantity:
                finalQuantity,
              price_at_addition:
                targetVariant.price
            }
          });

        await transaction
          .cart_items
          .delete({
            where: {
              id: item.id
            }
          });
      } else {
        await transaction
          .cart_items
          .update({
            where: {
              id: item.id
            },
            data: {
              product_variant_id:
                targetVariant.id,
              quantity:
                requestedQuantity,
              price_at_addition:
                targetVariant.price
            }
          });
      }

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

export async function removeCartItem(
  owner: CartOwner,
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
              carts:
                ownerCartWhere(owner)
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

export async function clearCart(
  owner: CartOwner
) {
  const cart =
    await getOrCreateCart(
      prisma,
      owner,
      false
    );

  await prisma.cart_items.deleteMany({
    where: {
      cart_id: cart.id
    }
  });

  const updatedCart =
    await prisma.carts
      .findUniqueOrThrow({
        where: {
          id: cart.id
        },
        include: cartInclude
      });

  return formatCart(updatedCart);
}

/**
 * Переносит гостевую корзину в активную корзину покупателя.
 * Одинаковые варианты объединяются, количество ограничивается остатком.
 * Метод идемпотентен: отсутствие гостевой корзины не считается ошибкой.
 */
export async function mergeGuestCart(
  customerId: string,
  guestToken: string
) {
  return prisma.$transaction(
    async (transaction) => {
      const customerCart =
        await getOrCreateCart(
          transaction,
          { customerId },
          false
        );

      const guestCart =
        await transaction
          .carts
          .findUnique({
            where: {
              guest_token:
                guestToken
            },
            include: {
              cart_items: {
                include: {
                  product_variants: {
                    include: {
                      products: true
                    }
                  }
                }
              }
            }
          });

      if (
        guestCart
        && guestCart.id
          !== customerCart.id
      ) {
        for (
          const item
          of guestCart.cart_items
        ) {
          const variant =
            item.product_variants;

          if (
            variant.status !== "active"
            || !variant.is_available
            || !variant.products.is_active
            || variant.stock_quantity <= 0
          ) {
            continue;
          }

          const existingItem =
            await transaction
              .cart_items
              .findUnique({
                where: {
                  cart_id_product_variant_id: {
                    cart_id:
                      customerCart.id,
                    product_variant_id:
                      variant.id
                  }
                }
              });

          const mergedQuantity =
            Math.min(
              (existingItem?.quantity ?? 0)
              + item.quantity,
              variant.stock_quantity
            );

          if (existingItem) {
            await transaction
              .cart_items
              .update({
                where: {
                  id: existingItem.id
                },
                data: {
                  quantity:
                    mergedQuantity,
                  price_at_addition:
                    variant.price
                }
              });
          } else {
            await transaction
              .cart_items
              .create({
                data: {
                  cart_id:
                    customerCart.id,
                  product_variant_id:
                    variant.id,
                  quantity:
                    mergedQuantity,
                  price_at_addition:
                    variant.price
                }
              });
          }
        }

        await transaction
          .carts
          .delete({
            where: {
              id: guestCart.id
            }
          });
      }

      const updatedCart =
        await transaction
          .carts
          .findUniqueOrThrow({
            where: {
              id: customerCart.id
            },
            include: cartInclude
          });

      return formatCart(updatedCart);
    }
  );
}
