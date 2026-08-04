import type {
  ProductDetails,
  ProductListItem,
  ProductVariant as ApiProductVariant
} from "../../shared/types/product";

import type {
  ProductRecommendation,
  ProductVariant,
  ProductVariantStatus,
  ProductView
} from "./product.types";

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
  const numericWeight =
    parseNumber(weight);

  return `${numericWeight.toLocaleString(
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

  if (variant.stock_quantity <= 5) {
    return "low";
  }

  return "available";
}

function mapVariant(
  variant: ApiProductVariant
): ProductVariant {
  return {
    id: variant.id,
    sku: variant.sku,
    label: formatWeight(
      variant.weight_g
    ),
    price: parseNumber(
      variant.price
    ),
    oldPrice:
      variant.old_price === null
        ? null
        : parseNumber(
            variant.old_price
          ),
    stock: variant.stock_quantity,
    status: getVariantStatus(
      variant
    )
  };
}

function getLowestPrice(
  variants: ApiProductVariant[]
): {
  price: number;
  oldPrice: number | null;
} {
  const availableVariants =
    variants.filter(
      (variant) =>
        variant.is_available
        && variant.status === "active"
    );

  const source =
    availableVariants.length > 0
      ? availableVariants
      : variants;

  const cheapest = [...source]
    .sort(
      (left, right) =>
        parseNumber(left.price)
        - parseNumber(right.price)
    )[0];

  return {
    price: cheapest
      ? parseNumber(
          cheapest.price
        )
      : 0,
    oldPrice:
      cheapest?.old_price === null
      || cheapest?.old_price === undefined
        ? null
        : parseNumber(
            cheapest.old_price
          )
  };
}

function mapRecommendation(
  product: ProductListItem
): ProductRecommendation {
  const price = getLowestPrice(
    product.product_variants
  );

  const image =
    product.product_images[0];

  return {
    slug: product.slug,
    name: product.name,
    price: price.price,
    oldPrice: price.oldPrice,
    imageUrl:
      image?.image_url ?? null,
    imageAlt:
      image?.alt_text
      ?? product.name
  };
}

function formatSeconds(
  seconds: number | null
): string {
  if (seconds === null) {
    return "";
  }

  if (seconds < 60) {
    return `${seconds} сек.`;
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  return remainingSeconds > 0
    ? `${minutes} мин. ${remainingSeconds} сек.`
    : `${minutes} мин.`;
}

export function mapProductDetailsToView(
  product: ProductDetails
): ProductView {
  const variants =
    product.product_variants
      .map(mapVariant);

  const firstVariant =
    variants[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle:
      product.short_description
      ?? "",
    rating: "",
    reviews: 0,
    article:
      firstVariant?.sku ?? "",
    country:
      product.country ?? "",
    region:
      product.region ?? "",
    producer:
      product.manufacturer ?? "",
    teaType:
      product.tea_type ?? "",
    fermentation:
      product.fermentation_level
      ?? "",
    form:
      product.product_form
      ?? "",
    images:
      product.product_images.map(
        (image) => ({
          url: image.image_url,
          alt:
            image.alt_text
            ?? product.name
        })
      ),
    variants,
    aboutTea:
      product.about_tea ?? "",
    taste:
      product.taste ?? "",
    aroma:
      product.aroma ?? "",
    effect:
      product.effect ?? "",
    beneficialProperties:
      product.beneficial_properties
      ?? "",
    brewing: {
      waterTemperature:
        product.water_temperature_c
        === null
          ? ""
          : `${product.water_temperature_c} °C`,
      teaAmount:
        product.tea_amount_g === null
          ? ""
          : `${parseNumber(
              product.tea_amount_g
            ).toLocaleString(
              "ru-RU",
              {
                maximumFractionDigits: 3
              }
            )} г`,
      brewingTime:
        formatSeconds(
          product.brewing_time_seconds
        ),
      infusionCount:
        product.infusion_count === null
          ? ""
          : `${product.infusion_count}`,
      tips:
        product.brewing_tips
        ?? ""
    },
    relatedProducts:
      product.relatedProducts.map(
        mapRecommendation
      ),
    similarProducts:
      product.similarProducts.map(
        mapRecommendation
      ),
    seoTitle:
      product.seo_title
      ?? product.name,
    seoDescription:
      product.seo_description
      ?? product.short_description
      ?? "",
    canonicalUrl:
      product.canonical_url,
    isIndexed:
      product.is_indexed
  };
}
