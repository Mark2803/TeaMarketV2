import { prisma } from "../../database/prisma.js";

export async function searchProducts(
  query: string
) {
  return prisma.products.findMany({
    where: {
      is_active: true,

      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          short_description: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          tea_type: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          country: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          region: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          manufacturer: {
            contains: query,
            mode: "insensitive"
          }
        }
      ]
    },

    orderBy: {
      name: "asc"
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
      }
    }
  });
}