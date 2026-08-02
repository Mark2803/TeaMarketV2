import { prisma } from "../../../database/prisma.js";

/**
 * Возвращает полную карточку товара для модератора.
 *
 * В отличие от публичной карточки:
 * - возвращает неактивный товар;
 * - возвращает все варианты;
 * - возвращает скрытые и архивные варианты;
 * - возвращает все изображения;
 * - возвращает категории и подборки;
 * - возвращает связанные и похожие товары.
 */
export async function getModeratorProductById(
  productId: string
) {
  const product =
    await prisma.products.findUnique({
      where: {
        id:
          productId
      },

      include: {
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
        },

        product_images: {
          orderBy: {
            sort_order:
              "asc"
          }
        },

        product_categories: {
  include: {
    categories: true
  },

  orderBy: [
    {
      is_primary: "desc"
    },
    {
      sort_order: "asc"
    }
  ]
},

        collection_products: {
          include: {
            collections:
              true
          },

          orderBy: {
            sort_order:
              "asc"
          }
        }
      }
    });

  if (!product) {
    return null;
  }

  const relations =
    await prisma.product_relations.findMany({
      where: {
        product_id:
          productId
      },

      orderBy: {
        sort_order:
          "asc"
      },

      include: {
        related_product: {
          include: {
            product_images: {
              orderBy: {
                sort_order:
                  "asc"
              },

              take: 1
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
        }
      }
    });

  return {
    ...product,

    relatedProducts:
      relations
        .filter(
          (relation) =>
            relation.relation_type ===
            "related"
        )
        .map(
          (relation) => ({
            relationId:
              relation.id,

            sortOrder:
              relation.sort_order,

            product:
              relation.related_product
          })
        ),

    similarProducts:
      relations
        .filter(
          (relation) =>
            relation.relation_type ===
            "similar"
        )
        .map(
          (relation) => ({
            relationId:
              relation.id,

            sortOrder:
              relation.sort_order,

            product:
              relation.related_product
          })
        )
  };
}
