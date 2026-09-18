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

  const include = {
    product_images: { orderBy: { sort_order: "asc" as const } },
    product_variants: {
      where: { status: "active" },
      orderBy: { sort_order: "asc" as const }
    },
    product_categories: {
      include: { categories: true },
      orderBy: { sort_order: "asc" as const }
    }
  };

  // Новинки задаются модератором флагом products.is_new в БД.
  // Prisma Client в текущем архиве сгенерирован до этой миграции, поэтому
  // IDs новинок читаем безопасным SQL; после prisma generate это также останется валидно.
  if (query.isNew === true) {
    const candidates = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id::text AS id
      FROM products p
      WHERE p.is_new = true
        AND p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.status = 'active'
        )
    `;

    let orderedIds = candidates.map(({ id }) => id);

    if (query.rotation === "daily") {
      const daySeed = new Date().toISOString().slice(0, 10);
      const hash = (value: string) => {
        let h = 2166136261;
        for (let i = 0; i < value.length; i += 1) {
          h ^= value.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };
      orderedIds = orderedIds.sort(
        (a, b) => hash(`${daySeed}:${a}`) - hash(`${daySeed}:${b}`)
      );
    } else {
      const dated = await prisma.products.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, created_at: true },
        orderBy: getOrderBy(query.sort)
      });
      orderedIds = dated.map(({ id }) => id);
    }

    const total = orderedIds.length;
    const pageIds = orderedIds.slice(skip, skip + query.limit);
    const rows = pageIds.length === 0
      ? []
      : await prisma.products.findMany({
          where: { id: { in: pageIds } },
          include
        });
    const byId = new Map(rows.map((item) => [item.id, item]));
    const items = pageIds.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
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