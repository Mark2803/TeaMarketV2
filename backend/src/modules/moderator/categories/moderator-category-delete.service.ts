import { prisma } from "../../../database/prisma.js";

export type DeleteModeratorCategoryResult =
  | {
      success: true;
      categoryId: string;
    }
  | {
      success: false;
      error:
        | "CATEGORY_NOT_FOUND"
        | "CATEGORY_HAS_CHILDREN"
        | "CATEGORY_HAS_PRODUCTS";
    };

/**
 * Безопасно удаляет категорию.
 *
 * Удаление запрещено, если:
 * - у категории есть дочерние категории;
 * - к категории привязаны товары.
 */
export async function deleteModeratorCategory(
  categoryId: string
): Promise<DeleteModeratorCategoryResult> {
  const category =
    await prisma.categories.findUnique({
      where: {
        id:
          categoryId
      },

      select: {
        id: true
      }
    });

  if (!category) {
    return {
      success: false,
      error:
        "CATEGORY_NOT_FOUND"
    };
  }

  const childCategoryCount =
    await prisma.categories.count({
      where: {
        parent_category_id:
          categoryId
      }
    });

  if (childCategoryCount > 0) {
    return {
      success: false,
      error:
        "CATEGORY_HAS_CHILDREN"
    };
  }

  const productCategoryCount =
    await prisma.product_categories.count({
      where: {
        category_id:
          categoryId
      }
    });

  if (productCategoryCount > 0) {
    return {
      success: false,
      error:
        "CATEGORY_HAS_PRODUCTS"
    };
  }

  await prisma.categories.delete({
    where: {
      id:
        categoryId
    }
  });

  return {
    success: true,
    categoryId
  };
}