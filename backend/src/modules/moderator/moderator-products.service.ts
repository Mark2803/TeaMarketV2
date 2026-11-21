import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  ModeratorProductsQuery
} from "./moderator-products.query.js";

/**
 * Возвращает список товаров для модератора.
 *
 * В отличие от публичного каталога:
 * - показывает неактивные товары;
 * - показывает hidden и archived варианты;
 * - возвращает остатки и служебные поля.
 */
export async function getModeratorProducts(
  query: ModeratorProductsQuery
) {
  const skip =
    (query.page - 1)
    * query.limit;

  const where:
  Prisma.productsWhereInput = {};

  if (
    query.isActive !== undefined
  ) {
    where.is_active =
      query.isActive;
  }

  if (query.variantStatus) {
    where.product_variants = {
      some: {
        status:
          query.variantStatus
      }
    };
  }

  if (query.search) {
    where.OR = [
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
      },

      {
        product_variants: {
          some: {
            sku: {
              contains:
                query.search,

              mode:
                "insensitive"
            }
          }
        }
      }
    ];
  }

  const [items, total] =
    await prisma.$transaction([
      prisma.products.findMany({
        where,

        skip,

        take:
          query.limit,

        orderBy: {
          updated_at:
            "desc"
        },

        include: {
          product_images: {
            orderBy: {
              sort_order:
                "asc"
            }
          },

          product_variants: {
            orderBy: [
              {
                sort_order:
                  "asc"
              },

              {
                weight_g:
                  "asc"
              }
            ]
          }
        }
      }),

      prisma.products.count({
        where
      })
    ]);

  // Сколько товаров открыто для поисковиков (по всему каталогу, без фильтров).
  const [indexedCount, allCount] =
    await prisma.$transaction([
      prisma.products.count({ where: { is_indexed: true } }),
      prisma.products.count()
    ]);

  return {
    items,

    indexing: {
      indexed: indexedCount,
      total: allCount
    },

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