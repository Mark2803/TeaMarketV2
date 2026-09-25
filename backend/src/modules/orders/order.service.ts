import { randomUUID } from "node:crypto";

import {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";
import { calculatePricing } from "../pricing/pricing.service.js";
import { sendTemplateEmail } from "../notifications/notification.service.js";

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
  const result: CreateOrderResult = await prisma.$transaction(
    async (transaction) => {
      // Сериализуем оформление одной корзины до чтения позиций.
      // Повторный запрос увидит уже закрытую корзину.
      await transaction.$queryRaw(Prisma.sql`
        SELECT id FROM carts
        WHERE status = 'active' AND ${"customerId" in owner
          ? Prisma.sql`customer_id = ${owner.customerId}::uuid`
          : Prisma.sql`guest_token = ${owner.guestToken}::uuid AND customer_id IS NULL`}
        FOR UPDATE
      `);
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
                products: {
                  include: {
                    product_categories: true,
                    collection_products: true
                  }
                }
              }
            }
          },

          orderBy: {
            created_at: "asc"
          }
        });

      const pricing = await calculatePricing(
        freshItems.map((item) => ({
          productId: item.product_variants.product_id,
          variantId: item.product_variants.id,
          quantity: item.quantity,
          unitPrice: Number(item.product_variants.price),
          categoryIds: item.product_variants.products.product_categories.map((x) => x.category_id),
          collectionIds: item.product_variants.products.collection_products.map((x) => x.collection_id)
        })),
        Number(deliveryMethod.base_cost),
        input.promoCode,
        input.referralCode,
        input.loyaltyToSpend,
        "customerId" in owner ? owner.customerId : null
      );
      const itemsTotal = pricing.itemsTotal;
      const deliveryCost = pricing.deliveryCost;
      const totalAmount = pricing.totalAmount;

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

            gross_items_total:
              pricing.grossItemsTotal.toFixed(2),

            discount_total:
              pricing.discountTotal.toFixed(2),

            promo_code:
              input.promoCode?.trim().toUpperCase() || null,

            loyalty_spent:
              pricing.loyaltySpent.toFixed(2),

            referral_code:
              input.referralCode?.trim().toUpperCase() || null,

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

                      list_price:
                        variant.price,

                      discount_amount:
                        "0.00",

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

      if (pricing.discounts.length) {
        await transaction.order_discounts.createMany({
          data: pricing.discounts.map((discount) => ({
            order_id: order.id,
            source_type: discount.sourceType,
            source_id: discount.sourceId,
            code: discount.code,
            name: discount.name,
            amount: discount.amount.toFixed(2),
            ...(discount.metadata
              ? { metadata: discount.metadata as Prisma.InputJsonValue }
              : {})
          }))
        });
      }

      const promoDiscount = pricing.discounts.find((x) => x.sourceType === "promo_code");
      if (promoDiscount?.sourceId) {
        await transaction.promo_codes.update({where:{id:promoDiscount.sourceId},data:{used_count:{increment:1}}});
      }

      if (pricing.loyaltySpent > 0 && customerId) {
        await transaction.loyalty_accounts.upsert({where:{customer_id:customerId},create:{customer_id:customerId,balance:0},update:{balance:{decrement:pricing.loyaltySpent}}});
        await transaction.loyalty_transactions.create({data:{customer_id:customerId,order_id:order.id,type:"spend",amount:(-pricing.loyaltySpent).toFixed(2),comment:"Списание при оформлении заказа"}});
      }

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

      // Позиции уже сохранены снимком в order_items. Не возвращаем
      // купленные товары при следующем открытии гостевой корзины.
      await transaction.cart_items.deleteMany({ where: { cart_id: cart.id } });

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

  if (result.success && result.order.email) {
    try {
      await sendTemplateEmail(
        "order_created",
        result.order.email,
        {
          order_number: result.order.order_number,
          total: Number(result.order.total_amount).toFixed(2)
        },
        result.order.customer_id
      );
    } catch (error) {
      console.error("[NOTIFICATIONS] Не удалось отправить письмо о новом заказе", error);
    }
  }

  return result;
}
