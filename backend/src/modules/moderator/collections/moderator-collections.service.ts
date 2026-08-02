import type {
  Prisma
} from "../../../generated/prisma/client.js";

import { prisma } from "../../../database/prisma.js";

import type {
  ModeratorCollectionsQuery
} from "./moderator-collections.query.js";

/**
 * Возвращает список подборок для модератора.
 */
export async function getModeratorCollections(
  query: ModeratorCollectionsQuery
) {
  const skip =
    (query.page - 1)
    * query.limit;

  const where:
  Prisma.collectionsWhereInput = {};

  if (
    query.isActive !== undefined
  ) {
    where.is_active =
      query.isActive;
  }

  if (
    query.showOnHome !== undefined
  ) {
    where.show_on_home =
      query.showOnHome;
  }

  if (
    query.collectionType !== undefined
  ) {
    where.collection_type =
      query.collectionType;
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

  const [collections, total] =
    await prisma.$transaction([
      prisma.collections.findMany({
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
              collection_products:
                true
            }
          }
        }
      }),

      prisma.collections.count({
        where
      })
    ]);

  const items =
    collections.map(
      (collection) => ({
        id:
          collection.id,

        name:
          collection.name,

        slug:
          collection.slug,

        description:
          collection.description,

        imageUrl:
          collection.image_url,

        collectionType:
          collection.collection_type,

        automationRules:
          collection.automation_rules,

        isActive:
          collection.is_active,

        showOnHome:
          collection.show_on_home,

        startsAt:
          collection.starts_at,

        endsAt:
          collection.ends_at,

        sortOrder:
          collection.sort_order,

        seoTitle:
          collection.seo_title,

        seoDescription:
          collection.seo_description,

        canonicalUrl:
          collection.canonical_url,

        isIndexed:
          collection.is_indexed,

        productCount:
          collection._count
            .collection_products,

        createdAt:
          collection.created_at,

        updatedAt:
          collection.updated_at
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