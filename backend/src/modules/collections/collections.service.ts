import { prisma } from "../../database/prisma.js";

import type {
  ProductsQuery
} from "../products/products.query.js";

import {
  getProducts
} from "../products/products.service.js";

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

export async function getCollections() {
  return prisma.collections.findMany({
    orderBy: {
      sort_order: "asc"
    },

    include: {
      collection_products: {
        where: {
          products: {
            is_active: true
          }
        },

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
}

export async function getCollectionBySlug(
  slug: string
) {
  return prisma.collections.findFirst({
    where: {
      slug
    },

    include: {
      collection_products: {
        where: {
          products: {
            is_active: true
          }
        },

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
}

export async function getCollectionProductsBySlug(
  slug: string,
  query: ProductsQuery
) {
  const collection =
    await prisma.collections.findFirst({
      where: {
        slug
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
            collection_id:
              collection.id
          }
        }
      }
    );

  return {
    collection,
    ...products
  };
}