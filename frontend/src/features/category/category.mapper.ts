import type {
  ProductListItem
} from "../../shared/types/product";

import type {
  CategoryProduct
} from "./category.types";

function formatMoney(
  value: string
): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value} ₽`;
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2
  }).format(number)} ₽`;
}

export function mapProductToCategoryCard(
  product: ProductListItem
): CategoryProduct {
  const activeVariants =
    product.product_variants.filter(
      (variant) =>
        variant.status === "active"
    );

  const availableVariants =
    activeVariants.filter(
      (variant) =>
        variant.is_available
        && variant.stock_quantity > 0
    );

  const variants =
    availableVariants.length > 0
      ? availableVariants
      : activeVariants;

  const firstVariant = variants[0];

  const minimumPrice =
    variants.reduce<number | null>(
      (minimum, variant) => {
        const price = Number(variant.price);

        if (!Number.isFinite(price)) {
          return minimum;
        }

        return minimum === null
          ? price
          : Math.min(minimum, price);
      },
      null
    );

  const image = product.product_images[0];

  const details = [
    product.tea_type,
    product.region,
    product.country
  ].filter(Boolean).join(" · ");

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    details:
      details
      || product.short_description
      || "Описание не указано",
    weight:
      variants.length > 1
        ? `от ${firstVariant?.weight_g ?? "—"} г`
        : firstVariant
          ? `${firstVariant.weight_g} г`
          : "Вес не указан",
    price:
      minimumPrice === null
        ? "Цена не указана"
        : formatMoney(String(minimumPrice)),
    badge: null,
    imageUrl: image?.image_url ?? null,
    imageAlt:
      image?.alt_text
      || product.name
  };
}
