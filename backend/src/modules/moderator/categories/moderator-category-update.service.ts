import { prisma } from "../../../database/prisma.js";

import type {
  UpdateModeratorCategoryInput
} from "./moderator-category.schemas.js";

export type UpdateModeratorCategoryResult =
  | {
      success: true;
      category: {
        id: string;
        name: string;
        slug: string;
      };
    }
  | {
      success: false;
      error:
        | "CATEGORY_NOT_FOUND"
        | "PARENT_CATEGORY_NOT_FOUND"
        | "CATEGORY_SLUG_ALREADY_EXISTS"
        | "CATEGORY_CANNOT_BE_OWN_PARENT";
    };

export async function updateModeratorCategory(
  categoryId: string,
  input: UpdateModeratorCategoryInput
): Promise<UpdateModeratorCategoryResult> {
  const category =
    await prisma.categories.findUnique({
      where: {
        id: categoryId
      }
    });

  if (!category) {
    return {
      success: false,
      error: "CATEGORY_NOT_FOUND"
    };
  }

  if (
    input.parentCategoryId !== undefined
  ) {
    if (
      input.parentCategoryId === categoryId
    ) {
      return {
        success: false,
        error:
          "CATEGORY_CANNOT_BE_OWN_PARENT"
      };
    }

    if (
      input.parentCategoryId !== null
    ) {
      const parent =
        await prisma.categories.findUnique({
          where: {
            id:
              input.parentCategoryId
          },

          select: {
            id: true
          }
        });

      if (!parent) {
        return {
          success: false,
          error:
            "PARENT_CATEGORY_NOT_FOUND"
        };
      }
    }
  }

  if (
    input.slug !== undefined
    && input.slug !== category.slug
  ) {
    const exists =
      await prisma.categories.findUnique({
        where: {
          slug:
            input.slug
        },

        select: {
          id: true
        }
      });

    if (exists) {
      return {
        success: false,
        error:
          "CATEGORY_SLUG_ALREADY_EXISTS"
      };
    }
  }

  const data: Record<
    string,
    unknown
  > = {};

  if (input.parentCategoryId !== undefined) {
    data.parent_category_id =
      input.parentCategoryId;
  }

  if (input.name !== undefined) {
    data.name =
      input.name;
  }

  if (input.slug !== undefined) {
    data.slug =
      input.slug;
  }

  if (input.description !== undefined) {
    data.description =
      input.description;
  }

  if (input.imageUrl !== undefined) {
    data.image_url =
      input.imageUrl;
  }

  if (input.sortOrder !== undefined) {
    data.sort_order =
      input.sortOrder;
  }

  if (input.isVisible !== undefined) {
    data.is_visible =
      input.isVisible;
  }

  if (input.seoTitle !== undefined) {
    data.seo_title =
      input.seoTitle;
  }

  if (input.seoDescription !== undefined) {
    data.seo_description =
      input.seoDescription;
  }

  if (input.canonicalUrl !== undefined) {
    data.canonical_url =
      input.canonicalUrl;
  }

  if (input.isIndexed !== undefined) {
    data.is_indexed =
      input.isIndexed;
  }

  const updated =
    await prisma.categories.update({
      where: {
        id:
          categoryId
      },

      data,

      select: {
        id: true,
        name: true,
        slug: true
      }
    });

  return {
    success: true,
    category:
      updated
  };
}