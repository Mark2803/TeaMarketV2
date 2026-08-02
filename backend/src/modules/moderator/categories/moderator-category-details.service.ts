import { prisma } from "../../../database/prisma.js";

/**
 * Возвращает полную карточку категории для модератора.
 */
export async function getModeratorCategoryById(
  categoryId: string
) {
  const category =
    await prisma.categories.findUnique({
      where: {
        id:
          categoryId
      }
    });

  if (!category) {
    return null;
  }

  const [
    parentCategory,
    childCategories,
    productLinks
  ] =
    await Promise.all([
      category.parent_category_id
        ? prisma.categories.findUnique({
            where: {
              id:
                category.parent_category_id
            },

            select: {
              id: true,
              name: true,
              slug: true,
              is_visible: true,
              sort_order: true
            }
          })
        : Promise.resolve(null),

      prisma.categories.findMany({
        where: {
          parent_category_id:
            categoryId
        },

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

        select: {
          id: true,
          name: true,
          slug: true,
          is_visible: true,
          sort_order: true
        }
      }),

      prisma.product_categories.findMany({
        where: {
          category_id:
            categoryId
        },

        orderBy: [
          {
            is_primary:
              "desc"
          },

          {
            sort_order:
              "asc"
          }
        ],

        include: {
          products: {
            select: {
              id: true,
              name: true,
              slug: true,
              is_active: true
            }
          }
        }
      })
    ]);

  return {
    id:
      category.id,

    parentCategoryId:
      category.parent_category_id,

    parentCategory,

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

    childCategories,

    products:
      productLinks.map(
        (link) => ({
          productId:
            link.product_id,

          isPrimary:
            link.is_primary,

          sortOrder:
            link.sort_order,

          product:
            link.products
        })
      ),

    createdAt:
      category.created_at,

    updatedAt:
      category.updated_at
  };
}