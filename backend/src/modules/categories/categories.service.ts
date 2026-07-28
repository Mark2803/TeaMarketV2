import { prisma } from "../../database/prisma.js";

import type {
  ProductsQuery
} from "../products/products.query.js";

import {
  getProducts
} from "../products/products.service.js";

export async function getCategories() {
  return prisma.categories.findMany({
    where: {
      parent_category_id: null,
      is_visible: true
    },

    orderBy: {
      sort_order: "asc"
    },

    include: {
      other_categories: {
        where: {
          is_visible: true
        },

        orderBy: {
          sort_order: "asc"
        }
      }
    }
  });
}

export async function getCategoryBySlug(
  slug: string
) {
  return prisma.categories.findFirst({
    where: {
      slug,
      is_visible: true
    },

    include: {
      categories: true,

      other_categories: {
        where: {
          is_visible: true
        },

        orderBy: {
          sort_order: "asc"
        }
      },

      product_categories: {
        orderBy: {
          sort_order: "asc"
        },

        include: {
          products: {
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
              }
            }
          }
        }
      }
    }
  });
}

export async function getCategoryProductsBySlug(
  slug: string,
  query: ProductsQuery
) {
  const category =
    await prisma.categories.findFirst({
      where: {
        slug,
        is_visible: true
      },

      select: {
        id: true,
        name: true,
        slug: true
      }
    });

  if (!category) {
    return null;
  }

  const products =
    await getProducts(
      query,
      {
        product_categories: {
          some: {
            category_id: category.id
          }
        }
      }
    );

  return {
    category,
    ...products
  };
}