import type {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

import type {
  ProductsQuery
} from "../products/products.query.js";

import {
  getProducts
} from "../products/products.service.js";

const activeCollectionWhere = (): Prisma.collectionsWhereInput => {
  const now = new Date();

  return {
    is_active: true,
    AND: [
      {
        OR: [
          { starts_at: null },
          { starts_at: { lte: now } }
        ]
      },
      {
        OR: [
          { ends_at: null },
          { ends_at: { gte: now } }
        ]
      }
    ]
  };
};

const productInclude = {
  product_images: {
    orderBy: {
      sort_order: "asc" as const
    }
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

const activeCollectionProducts = {
  products: {
    is_active: true,
    product_variants: {
      some: {
        status: "active"
      }
    }
  }
};

export async function getCollections() {
  const collections =
    await prisma.collections.findMany({
      where: activeCollectionWhere(),
      orderBy: [
        { sort_order: "asc" },
        { name: "asc" }
      ],
      include: {
        collection_products: {
          where: activeCollectionProducts,
          orderBy: {
            sort_order: "asc"
          },
          include: {
            products: {
              include: productInclude
            }
          }
        }
      }
    });

  return collections.map((collection) => ({
    ...collection,
    product_count:
      collection.collection_products.length
  }));
}

export async function getCollectionBySlug(
  slug: string
) {
  const collection =
    await prisma.collections.findFirst({
      where: {
        slug,
        ...activeCollectionWhere()
      },
      include: {
        collection_products: {
          where: activeCollectionProducts,
          orderBy: {
            sort_order: "asc"
          },
          include: {
            products: {
              include: productInclude
            }
          }
        }
      }
    });

  if (!collection) {
    return null;
  }

  return {
    ...collection,
    product_count:
      collection.collection_products.length
  };
}

export async function getCollectionProductsBySlug(
  slug: string,
  query: ProductsQuery
) {
  const collection =
    await prisma.collections.findFirst({
      where: {
        slug,
        ...activeCollectionWhere()
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

  if (!collection) {
    return null;
  }

  const products =
    await getProducts(
      query,
      {
        collection_products: {
          some: {
            collection_id: collection.id
          }
        }
      }
    );

  return {
    collection,
    ...products
  };
}
