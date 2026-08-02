import { prisma } from "../../../database/prisma.js";

/**
 * Возвращает полную карточку подборки для модератора.
 */
export async function getModeratorCollectionById(
  collectionId: string
) {
  const collection =
    await prisma.collections.findUnique({
      where: {
        id:
          collectionId
      },

      include: {
        collection_products: {
          orderBy: {
            sort_order:
              "asc"
          },

          include: {
            products: {
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
        }
      }
    });

  if (!collection) {
    return null;
  }

  return {
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

    products:
      collection.collection_products.map(
        (link) => ({
          productId:
            link.product_id,

          sortOrder:
            link.sort_order,

          product:
            link.products
        })
      ),

    createdAt:
      collection.created_at,

    updatedAt:
      collection.updated_at
  };
}