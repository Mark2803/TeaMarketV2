import { prisma } from "../../database/prisma.js";

import type {
  UpdateModeratorProductInput
} from "./moderator-product.schemas.js";

export type UpdateModeratorProductResult =
  | {
      success: true;
      product: {
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        updatedAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_NOT_FOUND"
        | "PRODUCT_SLUG_ALREADY_EXISTS";
    };

/**
 * Обновляет основную карточку товара.
 */
export async function updateModeratorProduct(
  productId: string,
  input: UpdateModeratorProductInput
): Promise<UpdateModeratorProductResult> {
  const currentProduct =
    await prisma.products.findUnique({
      where: {
        id:
          productId
      },

      select: {
        id: true,
        slug: true
      }
    });

  if (!currentProduct) {
    return {
      success: false,
      error:
        "PRODUCT_NOT_FOUND"
    };
  }

  if (
    input.slug !== undefined
    && input.slug !== currentProduct.slug
  ) {
    const existingProduct =
      await prisma.products.findUnique({
        where: {
          slug:
            input.slug
        },

        select: {
          id: true
        }
      });

    if (existingProduct) {
      return {
        success: false,
        error:
          "PRODUCT_SLUG_ALREADY_EXISTS"
      };
    }
  }

  const product =
    await prisma.products.update({
      where: {
        id:
          productId
      },

      data: {
        content_updated_at:
          new Date(),

        ...(input.name !== undefined
          ? {
              name:
                input.name
            }
          : {}),

        ...(input.slug !== undefined
          ? {
              slug:
                input.slug
            }
          : {}),

        ...(input.shortDescription !== undefined
          ? {
              short_description:
                input.shortDescription
            }
          : {}),

        ...(input.isActive !== undefined
          ? {
              is_active:
                input.isActive
            }
          : {}),

        ...(input.teaType !== undefined
          ? {
              tea_type:
                input.teaType
            }
          : {}),

        ...(input.country !== undefined
          ? {
              country:
                input.country
            }
          : {}),

        ...(input.region !== undefined
          ? {
              region:
                input.region
            }
          : {}),

        ...(input.manufacturer !== undefined
          ? {
              manufacturer:
                input.manufacturer
            }
          : {}),

        ...(input.fermentationLevel !== undefined
          ? {
              fermentation_level:
                input.fermentationLevel
            }
          : {}),

        ...(input.productForm !== undefined
          ? {
              product_form:
                input.productForm
            }
          : {}),

        ...(input.aboutTea !== undefined
          ? {
              about_tea:
                input.aboutTea
            }
          : {}),

        ...(input.taste !== undefined
          ? {
              taste:
                input.taste
            }
          : {}),

        ...(input.aroma !== undefined
          ? {
              aroma:
                input.aroma
            }
          : {}),

        ...(input.effect !== undefined
          ? {
              effect:
                input.effect
            }
          : {}),

        ...(input.beneficialProperties !== undefined
          ? {
              beneficial_properties:
                input.beneficialProperties
            }
          : {}),

        ...(input.waterTemperatureC !== undefined
          ? {
              water_temperature_c:
                input.waterTemperatureC
            }
          : {}),

        ...(input.teaAmountG !== undefined
          ? {
              tea_amount_g:
                input.teaAmountG
            }
          : {}),

        ...(input.brewingTimeSeconds !== undefined
          ? {
              brewing_time_seconds:
                input.brewingTimeSeconds
            }
          : {}),

        ...(input.infusionCount !== undefined
          ? {
              infusion_count:
                input.infusionCount
            }
          : {}),

        ...(input.brewingTips !== undefined
          ? {
              brewing_tips:
                input.brewingTips
            }
          : {}),

        ...(input.seoTitle !== undefined
          ? {
              seo_title:
                input.seoTitle
            }
          : {}),

        ...(input.seoDescription !== undefined
          ? {
              seo_description:
                input.seoDescription
            }
          : {}),

        ...(input.canonicalUrl !== undefined
          ? {
              canonical_url:
                input.canonicalUrl
            }
          : {}),

        ...(input.isIndexed !== undefined
          ? {
              is_indexed:
                input.isIndexed
            }
          : {})
      },

      select: {
        id: true,
        name: true,
        slug: true,
        is_active: true,
        updated_at: true
      }
    });

  if (input.isNew !== undefined) {
    await prisma.$executeRaw`
      UPDATE products SET is_new = ${input.isNew} WHERE id = ${productId}::uuid
    `;
  }

  return {
    success: true,

    product: {
      id:
        product.id,

      name:
        product.name,

      slug:
        product.slug,

      isActive:
        product.is_active,

      updatedAt:
        product.updated_at
    }
  };
}