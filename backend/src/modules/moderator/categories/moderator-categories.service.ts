import type {
  Prisma
} from "../../../generated/prisma/client.js";

import { prisma } from "../../../database/prisma.js";

import type {
  ModeratorCategoriesQuery
} from "./moderator-categories.query.js";

/**
 * Возвращает список категорий для модератора.
 *
 * Показывает видимые и скрытые категории,
 * родительскую категорию, количество дочерних
 * категорий и количество привязанных товаров.
 */
export async function getModeratorCategories(
  query: ModeratorCategoriesQuery
) {
  const skip =
    (query.page - 1)
    * query.limit;

  const where:
  Prisma.categoriesWhereInput = {};

  if (
    query.isVisible !== undefined
  ) {
    where.is_visible =
      query.isVisible;
  }

  if (
    query.parentCategoryId !== undefined
  ) {
    where.parent_category_id =
      query.parentCategoryId;
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
      }
    ];
  }

  const [categories, total] =
    await prisma.$transaction([
      prisma.categories.findMany({
        where,

        skip,

        take:
          query.limit,

        orderBy: [
          {
            sort_order:
              "asc"
          },

          {
            name:
              "asc"
          }
        ],

        include: {
          _count: {
            select: {
              product_categories:
                true
            }
          }
        }
      }),

      prisma.categories.count({
        where
      })
    ]);

  const parentCategoryIds =
    Array.from(
      new Set(
        categories
          .map(
            (category) =>
              category.parent_category_id
          )
          .filter(
            (
              parentCategoryId
            ): parentCategoryId is string =>
              parentCategoryId !== null
          )
      )
    );

  const categoryIds =
    categories.map(
      (category) =>
        category.id
    );

  const [
    parentCategories,
    childCategoryGroups
  ] =
    await Promise.all([
      parentCategoryIds.length > 0
        ? prisma.categories.findMany({
            where: {
              id: {
                in:
                  parentCategoryIds
              }
            },

            select: {
              id: true,
              name: true,
              slug: true
            }
          })
        : Promise.resolve([]),

      categoryIds.length > 0
        ? prisma.categories.groupBy({
            by: [
              "parent_category_id"
            ],

            where: {
              parent_category_id: {
                in:
                  categoryIds
              }
            },

            _count: {
              _all:
                true
            }
          })
        : Promise.resolve([])
    ]);

  const parentCategoryMap =
    new Map(
      parentCategories.map(
        (category) => [
          category.id,
          category
        ]
      )
    );

  const childCountMap =
    new Map(
      childCategoryGroups.map(
        (group) => [
          group.parent_category_id,
          group._count._all
        ]
      )
    );

  const items =
    categories.map(
      (category) => ({
        id:
          category.id,

        parentCategoryId:
          category.parent_category_id,

        parentCategory:
          category.parent_category_id
            ? (
                parentCategoryMap.get(
                  category.parent_category_id
                )
                ?? null
              )
            : null,

        name:
          category.name,

        slug:
          category.slug,

        description:
          category.description,

        imageUrl:
          category.image_url,

        sortOrder:
          category.sort_order,

        isVisible:
          category.is_visible,

        seoTitle:
          category.seo_title,

        seoDescription:
          category.seo_description,

        canonicalUrl:
          category.canonical_url,

        isIndexed:
          category.is_indexed,

        productCount:
          category._count
            .product_categories,

        childCategoryCount:
          childCountMap.get(
            category.id
          )
          ?? 0,

        createdAt:
          category.created_at,

        updatedAt:
          category.updated_at
      })
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