import { prisma } from "../../database/prisma.js";

import type {
  CreateModeratorProductInput
} from "./moderator-product.schemas.js";

export type CreateModeratorProductResult =
  | {
      success: true;
      product: {
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
        createdAt: Date;
      };
    }
  | {
      success: false;
      error:
        | "PRODUCT_SLUG_ALREADY_EXISTS"
        | "VARIANT_SKU_ALREADY_EXISTS";
    };

export async function createModeratorProduct(
  input: CreateModeratorProductInput
): Promise<CreateModeratorProductResult> {
  const existingProduct =
    await prisma.products.findUnique({
      where: { slug: input.slug },
      select: { id: true }
    });

  if (existingProduct) {
    return {
      success: false,
      error: "PRODUCT_SLUG_ALREADY_EXISTS"
    };
  }

  const existingVariant =
    await prisma.product_variants.findUnique({
      where: { sku: input.firstVariant.sku },
      select: { id: true }
    });

  if (existingVariant) {
    return {
      success: false,
      error: "VARIANT_SKU_ALREADY_EXISTS"
    };
  }

  const product = await prisma.$transaction(async (tx) => {
    const createdProduct =
      await tx.products.create({
        data: {
          name: input.name,
          slug: input.slug,
          is_active: input.isActive,
          is_indexed: input.isIndexed,
          content_updated_at: new Date(),

          ...(input.shortDescription !== undefined
            ? { short_description: input.shortDescription }
            : {}),
          ...(input.teaType !== undefined
            ? { tea_type: input.teaType }
            : {}),
          ...(input.country !== undefined
            ? { country: input.country }
            : {}),
          ...(input.region !== undefined
            ? { region: input.region }
            : {}),
          ...(input.manufacturer !== undefined
            ? { manufacturer: input.manufacturer }
            : {}),
          ...(input.fermentationLevel !== undefined
            ? { fermentation_level: input.fermentationLevel }
            : {}),
          ...(input.productForm !== undefined
            ? { product_form: input.productForm }
            : {}),
          ...(input.aboutTea !== undefined
            ? { about_tea: input.aboutTea }
            : {}),
          ...(input.taste !== undefined
            ? { taste: input.taste }
            : {}),
          ...(input.aroma !== undefined
            ? { aroma: input.aroma }
            : {}),
          ...(input.effect !== undefined
            ? { effect: input.effect }
            : {}),
          ...(input.beneficialProperties !== undefined
            ? { beneficial_properties: input.beneficialProperties }
            : {}),
          ...(input.waterTemperatureC !== undefined
            ? { water_temperature_c: input.waterTemperatureC }
            : {}),
          ...(input.teaAmountG !== undefined
            ? { tea_amount_g: input.teaAmountG }
            : {}),
          ...(input.brewingTimeSeconds !== undefined
            ? { brewing_time_seconds: input.brewingTimeSeconds }
            : {}),
          ...(input.infusionCount !== undefined
            ? { infusion_count: input.infusionCount }
            : {}),
          ...(input.brewingTips !== undefined
            ? { brewing_tips: input.brewingTips }
            : {}),
          ...(input.seoTitle !== undefined
            ? { seo_title: input.seoTitle }
            : {}),
          ...(input.seoDescription !== undefined
            ? { seo_description: input.seoDescription }
            : {}),
          ...(input.canonicalUrl !== undefined
            ? { canonical_url: input.canonicalUrl }
            : {})
        },
        select: {
          id: true,
          name: true,
          slug: true,
          is_active: true,
          created_at: true
        }
      });

    await tx.product_variants.create({
      data: {
        product_id: createdProduct.id,
        sku: input.firstVariant.sku,
        weight_g: input.firstVariant.weightG,
        price: input.firstVariant.price,
        old_price: input.firstVariant.oldPrice ?? null,
        stock_quantity: input.firstVariant.stockQuantity,
        sort_order: input.firstVariant.sortOrder,
        is_available: input.firstVariant.isAvailable,
        status: input.firstVariant.status
      }
    });

    if (input.isNew) {
      await tx.$executeRaw`
        UPDATE products
        SET is_new = true
        WHERE id = ${createdProduct.id}::uuid
      `;
    }

    return createdProduct;
  });

  return {
    success: true,
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      isActive: product.is_active,
      createdAt: product.created_at
    }
  };
}
