import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  ModeratorStockQuery
} from "./moderator-stock.query.js";

/**
 * Возвращает остатки с пагинацией по вариантам/SKU,
 * а не по товарам.
 */
export async function getModeratorStock(
  query: ModeratorStockQuery
) {
  const skip =
    (query.page - 1)
    * query.limit;

  const where:
  Prisma.product_variantsWhereInput = {};

  if (query.stockStatus === "out") {
    where.stock_quantity = 0;
  }

  if (query.stockStatus === "low") {
    where.stock_quantity = {
      gt: 0,
      lte:
        query.lowStockThreshold
    };
  }

  if (query.search) {
    const matchingProducts =
      await prisma.products.findMany({
        where: {
          OR: [
            {
              name: {
                contains:
                  query.search,
                mode:
                  "insensitive"
              }
            },
            {
              slug: {
                contains:
                  query.search,
                mode:
                  "insensitive"
              }
            }
          ]
        },

        select: {
          id: true
        }
      });

    const productIds =
      matchingProducts.map(
        (product) => product.id
      );

    where.OR = [
      {
        sku: {
          contains:
            query.search,
          mode:
            "insensitive"
        }
      },

      ...(productIds.length > 0
        ? [
            {
              product_id: {
                in:
                  productIds
              }
            }
          ]
        : [])
    ];
  }

  const [variants, total] =
    await prisma.$transaction([
      prisma.product_variants.findMany({
        where,

        skip,

        take:
          query.limit,

        orderBy: [
          {
            updated_at:
              "desc"
          },
          {
            sku:
              "asc"
          }
        ],

        select: {
          id: true,
          product_id: true,
          sku: true,
          weight_g: true,
          price: true,
          old_price: true,
          stock_quantity: true,
          is_available: true,
          status: true,
          sort_order: true,
          updated_at: true
        }
      }),

      prisma.product_variants.count({
        where
      })
    ]);

  const productIds = [
    ...new Set(
      variants.map(
        (variant) =>
          variant.product_id
      )
    )
  ];

  const products =
    productIds.length > 0
      ? await prisma.products.findMany({
          where: {
            id: {
              in:
                productIds
            }
          },

          select: {
            id: true,
            name: true,
            slug: true,
            is_active: true
          }
        })
      : [];

  const productsById =
    new Map(
      products.map(
        (product) => [
          product.id,
          product
        ]
      )
    );

  const items =
    variants.map(
      (variant) => {
        const product =
          productsById.get(
            variant.product_id
          );

        return {
          productId:
            variant.product_id,

          productName:
            product?.name ?? "",

          productSlug:
            product?.slug ?? "",

          productIsActive:
            product?.is_active ?? false,

          variantId:
            variant.id,

          sku:
            variant.sku,

          weightG:
            variant.weight_g.toString(),

          price:
            variant.price.toString(),

          oldPrice:
            variant.old_price
              ? variant.old_price.toString()
              : null,

          stockQuantity:
            variant.stock_quantity,

          isAvailable:
            variant.is_available,

          status:
            variant.status,

          sortOrder:
            variant.sort_order,

          updatedAt:
            variant.updated_at
        };
      }
    );

  return {
    items,

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        Math.ceil(
          total
          / query.limit
        )
    }
  };
}
