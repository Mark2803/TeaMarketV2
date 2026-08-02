import {
  Prisma
} from "../../../generated/prisma/client.js";

import {
  prisma
} from "../../../database/prisma.js";

import type {
  UpdateModeratorCollectionInput
} from "./moderator-collection.schemas.js";

export type UpdateModeratorCollectionResult =
  | {
      success: true;
      collection: {
        id: string;
        name: string;
        slug: string;
        collectionType: string;
        isActive: boolean;
        showOnHome: boolean;
        sortOrder: number;
        updatedAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "COLLECTION_NOT_FOUND"
        | "COLLECTION_SLUG_ALREADY_EXISTS"
        | "AUTOMATION_RULES_REQUIRED"
        | "INVALID_COLLECTION_DATES";
    };

/**
 * Обновляет подборку товаров.
 *
 * В Prisma передаются только поля,
 * которые действительно присутствуют в PATCH.
 */
export async function updateModeratorCollection(
  collectionId: string,
  input: UpdateModeratorCollectionInput
): Promise<UpdateModeratorCollectionResult> {
  const collection =
    await prisma.collections.findUnique({
      where: {
        id:
          collectionId
      }
    });

  if (!collection) {
    return {
      success: false,
      error:
        "COLLECTION_NOT_FOUND"
    };
  }

  if (
    input.slug !== undefined
    && input.slug !== collection.slug
  ) {
    const collectionWithSameSlug =
      await prisma.collections.findUnique({
        where: {
          slug:
            input.slug
        },

        select: {
          id: true
        }
      });

    if (collectionWithSameSlug) {
      return {
        success: false,
        error:
          "COLLECTION_SLUG_ALREADY_EXISTS"
      };
    }
  }

  const resultingCollectionType =
    input.collectionType
    ?? collection.collection_type;

  const resultingAutomationRules =
    input.automationRules !== undefined
      ? input.automationRules
      : collection.automation_rules;

  if (
    resultingCollectionType ===
      "automatic"
    && resultingAutomationRules == null
  ) {
    return {
      success: false,
      error:
        "AUTOMATION_RULES_REQUIRED"
    };
  }

  const resultingStartsAt =
    input.startsAt !== undefined
      ? input.startsAt
      : collection.starts_at;

  const resultingEndsAt =
    input.endsAt !== undefined
      ? input.endsAt
      : collection.ends_at;

  if (
    resultingStartsAt !== null
    && resultingEndsAt !== null
    && resultingStartsAt
      >= resultingEndsAt
  ) {
    return {
      success: false,
      error:
        "INVALID_COLLECTION_DATES"
    };
  }

  const updateData:
    Prisma.collectionsUpdateInput = {};

  if (
    input.name !== undefined
  ) {
    updateData.name =
      input.name;
  }

  if (
    input.slug !== undefined
  ) {
    updateData.slug =
      input.slug;
  }

  if (
    input.description !== undefined
  ) {
    updateData.description =
      input.description;
  }

  if (
    input.imageUrl !== undefined
  ) {
    updateData.image_url =
      input.imageUrl;
  }

  if (
    input.collectionType !== undefined
  ) {
    updateData.collection_type =
      input.collectionType;
  }

  if (
    input.automationRules !== undefined
  ) {
    updateData.automation_rules =
      input.automationRules === null
        ? Prisma.JsonNull
        : JSON.parse(
            JSON.stringify(
              input.automationRules
            )
          ) as Prisma.InputJsonValue;
  }

  if (
    input.isActive !== undefined
  ) {
    updateData.is_active =
      input.isActive;
  }

  if (
    input.showOnHome !== undefined
  ) {
    updateData.show_on_home =
      input.showOnHome;
  }

  if (
    input.startsAt !== undefined
  ) {
    updateData.starts_at =
      input.startsAt;
  }

  if (
    input.endsAt !== undefined
  ) {
    updateData.ends_at =
      input.endsAt;
  }

  if (
    input.sortOrder !== undefined
  ) {
    updateData.sort_order =
      input.sortOrder;
  }

  if (
    input.seoTitle !== undefined
  ) {
    updateData.seo_title =
      input.seoTitle;
  }

  if (
    input.seoDescription !== undefined
  ) {
    updateData.seo_description =
      input.seoDescription;
  }

  if (
    input.canonicalUrl !== undefined
  ) {
    updateData.canonical_url =
      input.canonicalUrl;
  }

  if (
    input.isIndexed !== undefined
  ) {
    updateData.is_indexed =
      input.isIndexed;
  }

  const updatedCollection =
    await prisma.collections.update({
      where: {
        id:
          collectionId
      },

      data:
        updateData,

      select: {
        id: true,
        name: true,
        slug: true,
        collection_type: true,
        is_active: true,
        show_on_home: true,
        sort_order: true,
        updated_at: true
      }
    });

  return {
    success: true,

    collection: {
      id:
        updatedCollection.id,

      name:
        updatedCollection.name,

      slug:
        updatedCollection.slug,

      collectionType:
        updatedCollection
          .collection_type,

      isActive:
        updatedCollection.is_active,

      showOnHome:
        updatedCollection.show_on_home,

      sortOrder:
        updatedCollection.sort_order,

      updatedAt:
        updatedCollection.updated_at
    }
  };
}