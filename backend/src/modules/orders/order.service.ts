import { randomUUID } from "node:crypto";

import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  CreateOrderInput
} from "./order.schemas.js";

const orderInclude = {
  order_items: {
    orderBy: {
      id: "asc" as const
    }
  },

  order_deliveries: {
    include: {
      delivery_methods: true
    }
  },

  order_payments: {
    include: {
      payment_methods: true
    }
  },

  order_status_history: {
    orderBy: {
      changed_at: "asc" as const
    }
  }
} satisfies Prisma.ordersInclude;

type OrderOwner =
  | {
      customerId: string;
      guestToken?: never;
    }
  | {
      customerId?: never;
      guestToken: string;
    };

export type CreateOrderError =
  | "CART_NOT_FOUND"
  | "CART_EMPTY"
  | "DELIVERY_METHOD_NOT_FOUND"
  | "PAYMENT_METHOD_NOT_FOUND"
  | "PRODUCT_VARIANT_NOT_FOUND"
  | "INSUFFICIENT_STOCK";

export type CreateOrderResult =
  | {
      success: true;
      order: Prisma.ordersGetPayload<{
        include: typeof orderInclude;
      }>;
    }
  | {
      success: false;
      error: CreateOrderError;
      productVariantId?: string;
      availableQuantity?: number;
    };

function createOrderNumber() {
  const date =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const suffix =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();

  return `TM-${date}-${suffix}`;
}

function cartWhere(
  owner: OrderOwner
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

/**
 * Создаёт заказ из активной корзины.
 * Источник корзины определяется владельцем:
 * customer_id для авторизованного покупателя
 * или guest_token для гостя.
 */
export async function createOrder(
  owner: OrderOwner,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  return prisma.$transaction(
    async (transaction) => {
      const cart =
        await transaction.carts.findFirst({
          where:
            cartWhere(owner),

          orderBy: {
            updated_at: "desc"
          },

          include: {
            cart_items: {
              include: {
                product_variants: {
                  include: {
                    products: true
                  }
                }
              },

              orderBy: {
                created_at: "asc"
              }
            }
          }
        });

      if (!cart) {
        return {
          success: false,
          error: "CART_NOT_FOUND"
        };
      }

      if (cart.cart_items.length === 0) {
        return {
          success: false,
          error: "CART_EMPTY"
        };
      }

      const deliveryMethod =
        await transaction
          .delivery_methods
          .findFirst({
            where: {
              id: input.deliveryMethodId,
              is_active: true
            }
          });

      if (!deliveryMethod) {
        return {
          success: false,
          error:
            "DELIVERY_METHOD_NOT_FOUND"
        };
      }

      const paymentMethod =
        await transaction
          .payment_methods
          .findFirst({
            where: {
              id: input.paymentMethodId,
              is_active: true
            }
          });

      if (!paymentMethod) {
        return {
          success: false,
          error:
            "PAYMENT_METHOD_NOT_FOUND"
        };
      }

      for (const item of cart.cart_items) {
        const variant =
          await transaction
            .product_variants
            .findFirst({
              where: {
                id:
                  item.product_variant_id,
                status: "active",
                is_available: true,
                products: {
                  is_active: true
                }
              },

              include: {
                products: true
              }
            });

        if (!variant) {
          return {
            success: false,
            error:
              "PRODUCT_VARIANT_NOT_FOUND",
            productVariantId:
              item.product_variant_id
          };
        }

        if (
          item.quantity >
          variant.stock_quantity
        ) {
          return {
            success: false,
            error:
              "INSUFFICIENT_STOCK",
            productVariantId:
              variant.id,
            availableQuantity:
              variant.stock_quantity
          };
        }
      }

      const freshItems =
        await transaction.cart_items.findMany({
          where: {
            cart_id: cart.id
          },

          include: {
            product_variants: {
              include: {
                products: true
              }
            }
          },

          orderBy: {
            created_at: "asc"
          }
        });

      const itemsTotal =
        freshItems.reduce(
          (sum, item) =>
            sum
            + Number(
              item.product_variants.price
            ) * item.quantity,
          0
        );

      const deliveryCost =
        Number(
          deliveryMethod.base_cost
        );

      const totalAmount =
        itemsTotal + deliveryCost;

      const customerId =
        "customerId" in owner
          ? owner.customerId
          : null;

      const order =
        await transaction.orders.create({
          data: {
            customer_id:
              customerId,

            order_number:
              createOrderNumber(),

            customer_name:
              input.customerName,

            phone:
              input.phone,

            email:
              input.email || null,

            comment:
              input.comment || null,

            status:
              "new",

            payment_status:
              "unpaid",

            items_total:
              itemsTotal.toFixed(2),

            delivery_cost:
              deliveryCost.toFixed(2),

            total_amount:
              totalAmount.toFixed(2),

            order_items: {
              create:
                freshItems.map(
                  (item) => {
                    const variant =
                      item.product_variants;

                    const unitPrice =
                      Number(
                        variant.price
                      );

                    return {
                      product_id:
                        variant.product_id,

                      product_name:
                        variant.products.name,

                      sku:
                        variant.sku,

                      weight_g:
                        variant.weight_g,

                      unit_price:
                        variant.price,

                      quantity:
                        item.quantity,

                      line_total:
                        (
                          unitPrice
                          * item.quantity
                        ).toFixed(2)
                    };
                  }
                )
            },

            order_deliveries: {
              create: {
                delivery_method_id:
                  deliveryMethod.id,

                cost:
                  deliveryMethod.base_cost,

                recipient_name:
                  input.delivery
                    .recipientName,

                phone:
                  input.delivery.phone,

                full_address:
                  input.delivery
                    .fullAddress,

                comment:
                  input.delivery.comment
                  || null,

                status:
                  "pending"
              }
            },

            order_payments: {
              create: {
                payment_method_id:
                  paymentMethod.id,

                amount:
                  totalAmount.toFixed(2),

                status:
                  "pending"
              }
            },

            order_status_history: {
              create: {
                new_status:
                  "new"
              }
            }
          }
        });

      /*
       * Уменьшение остатка выполняется условным updateMany,
       * чтобы исключить отрицательный остаток при конкурентных заказах.
       */
      for (const item of freshItems) {
        const updateResult =
          await transaction
            .product_variants
            .updateMany({
              where: {
                id:
                  item.product_variant_id,
                stock_quantity: {
                  gte:
                    item.quantity
                }
              },

              data: {
                stock_quantity: {
                  decrement:
                    item.quantity
                }
              }
            });

        if (updateResult.count !== 1) {
          throw new Error(
            `INSUFFICIENT_STOCK:${item.product_variant_id}`
          );
        }
      }

      await transaction.carts.update({
        where: {
          id: cart.id
        },

        data: {
          status: "converted"
        }
      });

      const createdOrder =
        await transaction
          .orders
          .findUniqueOrThrow({
            where: {
              id: order.id
            },

            include: orderInclude
          });

      return {
        success: true,
        order: createdOrder
      };
    }
  );
}
