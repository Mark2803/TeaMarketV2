import { prisma } from "../../../database/prisma.js";

import type {
  CreateModeratorCategoryInput
} from "./moderator-category.schemas.js";

export type CreateModeratorCategoryResult =
  | {
      success: true;
      category: {
        id: string;
        parentCategoryId: string | null;
        name: string;
        slug: string;
        description: string | null;
        imageUrl: string | null;
        sortOrder: number;
        isVisible: boolean;
        seoTitle: string | null;
        seoDescription: string | null;
        canonicalUrl: string | null;
        isIndexed: boolean;
        createdAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "PARENT_CATEGORY_NOT_FOUND"
        | "CATEGORY_SLUG_ALREADY_EXISTS";
    };

/**
 * Создаёт категорию каталога.
 */
export async function createModeratorCategory(
  input: CreateModeratorCategoryInput
): Promise<CreateModeratorCategoryResult> {
  if (
    input.parentCategoryId !== undefined
    && input.parentCategoryId !== null
  ) {
    const parentCategory =
      await prisma.categories.findUnique({
        where: {
          id:
            input.parentCategoryId
        },

        select: {
          id: true
        }
      });

    if (!parentCategory) {
      return {
        success: false,
        error:
          "PARENT_CATEGORY_NOT_FOUND"
      };
    }
  }

  const categoryWithSameSlug =
    await prisma.categories.findUnique({
      where: {
        slug:
          input.slug
      },

      select: {
        id: true
      }
    });

  if (categoryWithSameSlug) {
    return {
      success: false,
      error:
        "CATEGORY_SLUG_ALREADY_EXISTS"
    };
  }

  const category =
    await prisma.categories.create({
      data: {
        parent_category_id:
          input.parentCategoryId ?? null,

        name:
          input.name,

        slug:
          input.slug,

        description:
          input.description ?? null,

        image_url:
          input.imageUrl ?? null,

        sort_order:
          input.sortOrder,

        is_visible:
          input.isVisible,

        seo_title:
          input.seoTitle ?? null,

        seo_description:
          input.seoDescription ?? null,

        canonical_url:
          input.canonicalUrl ?? null,

        is_indexed:
          input.isIndexed
      },

      select: {
        id: true,
        parent_category_id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        sort_order: true,
        is_visible: true,
        seo_title: true,
        seo_description: true,
        canonical_url: true,
        is_indexed: true,
        created_at: true
      }
    });

  return {
    success: true,

    category: {
      id:
        category.id,

      parentCategoryId:
        category.parent_category_id,

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

      createdAt:
        category.created_at
    }
  };
}