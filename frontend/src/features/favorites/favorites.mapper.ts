import type {
  FavoriteApiItem,
  FavoriteProductApi
} from "../../shared/api/favorites";

import type {
  ProductVariant as ApiProductVariant
} from "../../shared/types/product";

import type {
  ProductVariant,
  ProductVariantStatus
} from "../product/product.types";

import type {
  FavoriteItem,
  FavoriteProduct
} from "./favorites.types";

function parseNumber(
  value: string | null | undefined
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatWeight(
  weight: string
): string {
  return `${parseNumber(weight).toLocaleString(
    "ru-RU",
    {
      maximumFractionDigits: 3
    }
  )} г`;
}

function getVariantStatus(
  variant: ApiProductVariant
): ProductVariantStatus {
  if (
    !variant.is_available
    || variant.status !== "active"
    || variant.stock_quantity <= 0
  ) {
    return "unavailable";
  }

  return variant.stock_quantity <= 5
    ? "low"
    : "available";
}

function mapVariant(
  variant: ApiProductVariant
): ProductVariant {
  return {
    id: variant.id,
    sku: variant.sku,
    label: formatWeight(variant.weight_g),
    price: parseNumber(variant.price),
    oldPrice:
      variant.old_price === null
        ? null
        : parseNumber(variant.old_price),
    stock: variant.stock_quantity,
    status: getVariantStatus(variant)
  };
}

function mapProduct(
  product: FavoriteProductApi
): FavoriteProduct {
  const image = product.product_images[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle:
      product.short_description
      ?? [
        product.tea_type,
        product.region,
        product.country
      ].filter(Boolean).join(" · "),
    image: image
      ? {
          url: image.image_url,
          alt:
            image.alt_text
            ?? product.name
        }
      : null,
    variants:
      product.product_variants.map(
        mapVariant
      )
  };
}

export function mapFavoriteItem(
  item: FavoriteApiItem
): FavoriteItem {
  return {
    addedAt: item.addedAt,
    product: mapProduct(item.product)
  };
}
