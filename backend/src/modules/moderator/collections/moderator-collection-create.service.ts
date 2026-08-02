import {
  Prisma
} from "../../../generated/prisma/client.js";

import {
  prisma
} from "../../../database/prisma.js";

import type {
  CreateModeratorCollectionInput
} from "./moderator-collection.schemas.js";

export type CreateModeratorCollectionResult =
  | {
      success: true;
      collection: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        imageUrl: string | null;
        collectionType: string;
        automationRules:
          Prisma.JsonValue | null;
        isActive: boolean;
        showOnHome: boolean;
        startsAt: Date | null;
        endsAt: Date | null;
        sortOrder: number;
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
        "COLLECTION_SLUG_ALREADY_EXISTS";
    };

/**
 * Создаёт подборку товаров.
 */
export async function createModeratorCollection(
  input: CreateModeratorCollectionInput
): Promise<CreateModeratorCollectionResult> {
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

  const automationRules:
    Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput =
      input.automationRules == null
        ? Prisma.JsonNull
        : JSON.parse(
            JSON.stringify(
              input.automationRules
            )
          ) as Prisma.InputJsonValue;

  const collection =
    await prisma.collections.create({
      data: {
        name:
          input.name,

        slug:
          input.slug,

        description:
          input.description ?? null,

        image_url:
          input.imageUrl ?? null,

        collection_type:
          input.collectionType,

        automation_rules:
          automationRules,

        is_active:
          input.isActive,

        show_on_home:
          input.showOnHome,

        starts_at:
          input.startsAt ?? null,

        ends_at:
          input.endsAt ?? null,

        sort_order:
          input.sortOrder,

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
        name: true,
        slug: true,
        description: true,
        image_url: true,
        collection_type: true,
        automation_rules: true,
        is_active: true,
        show_on_home: true,
        starts_at: true,
        ends_at: true,
        sort_order: true,
        seo_title: true,
        seo_description: true,
        canonical_url: true,
        is_indexed: true,
        created_at: true
      }
    });

  return {
    success: true,

    collection: {
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

      createdAt:
        collection.created_at
    }
  };
}