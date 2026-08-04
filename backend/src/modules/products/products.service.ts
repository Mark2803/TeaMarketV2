import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  ProductsQuery
} from "./products.query.js";

function getOrderBy(
  sort: ProductsQuery["sort"]
): Prisma.productsOrderByWithRelationInput {
  switch (sort) {
    case "name-asc":
      return {
        name: "asc"
      };

    case "name-desc":
      return {
        name: "desc"
      };

    case "newest":
    default:
      return {
        created_at: "desc"
      };
  }
}

export async function getProducts(
  query: ProductsQuery,
  additionalWhere?: Prisma.productsWhereInput
) {
  const skip =
    (query.page - 1) * query.limit;

  const variantFilters:
  Prisma.product_variantsWhereInput = {
    status: "active"
  };

if (query.minPrice !== undefined) {
  variantFilters.price = {
    ...(typeof variantFilters.price === "object"
      ? variantFilters.price
      : {}),
    gte: query.minPrice
  };
}

if (query.maxPrice !== undefined) {
  variantFilters.price = {
    ...(typeof variantFilters.price === "object"
      ? variantFilters.price
      : {}),
    lte: query.maxPrice
  };
}

if (query.inStock === true) {
  variantFilters.stock_quantity = {
    gt: 0
  };
}

const where: Prisma.productsWhereInput = {
  is_active: true,
  product_variants: {
    some: {
      status: "active"
    }
  }
};

if (query.teaType) {
  where.tea_type = {
    equals: query.teaType,
    mode: "insensitive"
  };
}

if (query.country) {
  where.country = {
    equals: query.country,
    mode: "insensitive"
  };
}

if (query.region) {
  where.region = {
    equals: query.region,
    mode: "insensitive"
  };
}

if (query.manufacturer) {
  where.manufacturer = {
    equals: query.manufacturer,
    mode: "insensitive"
  };
}

if (
  query.minPrice !== undefined ||
  query.maxPrice !== undefined ||
  query.inStock === true
) {
  where.product_variants = {
    some: variantFilters
  };
}

if (additionalWhere) {
  where.AND = [
    additionalWhere
  ];
}

  const [items, total] =
    await prisma.$transaction([
      prisma.products.findMany({
        where,

        skip,
        take: query.limit,

        orderBy: getOrderBy(
          query.sort
        ),

        include: {
          product_images: {
            orderBy: {
              sort_order: "asc"
            }
          },

          product_variants: {
            where: {
              status: "active"
            },

            orderBy: {
              sort_order: "asc"
            }
          },

          product_categories: {
            include: {
              categories: true
            },

            orderBy: {
              sort_order: "asc"
            }
          }
        }
      }),

      prisma.products.count({
        where
      })
    ]);

  return {
    items,

    pagination: {
      page: query.page,
      limit: query.limit,
      total,

      totalPages:
        Math.ceil(
          total / query.limit
        )
    }
  };
}

export async function getProductBySlug(
  slug: string
) {
  const product =
    await prisma.products.findFirst({
      where: {
        slug,
        is_active: true,
        product_variants: {
          some: {
            status: "active"
          }
        }
      },

      include: {
        product_images: {
          orderBy: {
            sort_order: "asc"
          }
        },

        product_variants: {
          where: {
            status: "active"
          },

          orderBy: {
            sort_order: "asc"
          }
        },

        product_categories: {
          include: {
            categories: true
          },

          orderBy: {
            sort_order: "asc"
          }
        },

        collection_products: {
          include: {
            collections: true
          },

          orderBy: {
            sort_order: "asc"
          }
        }
      }
    });

  if (!product) {
    return null;
  }

  const relationProductInclude = {
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
        sort_order: "asc" as const
      }
    }
  };

  const [
    relatedRelations,
    similarRelations
  ] = await Promise.all([
    prisma.product_relations.findMany({
      where: {
        product_id: product.id,
        relation_type: "related",

        related_product: {
          is_active: true
        }
      },

      orderBy: {
        sort_order: "asc"
      },

      include: {
        related_product: {
          include: relationProductInclude
        }
      }
    }),

    prisma.product_relations.findMany({
      where: {
        product_id: product.id,
        relation_type: "similar",

        related_product: {
          is_active: true
        }
      },

      orderBy: {
        sort_order: "asc"
      },

      include: {
        related_product: {
          include: relationProductInclude
        }
      }
    })
  ]);

  return {
    ...product,

    relatedProducts:
      relatedRelations.map(
        (relation) =>
          relation.related_product
      ),

    similarProducts:
      similarRelations.map(
        (relation) =>
          relation.related_product
      )
  };
}