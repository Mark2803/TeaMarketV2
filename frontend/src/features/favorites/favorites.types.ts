import type {
  ProductVariant,
  ProductVariantStatus
} from "../product/product.types";

export type FavoriteProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  image: {
    url: string;
    alt: string;
  } | null;
  variants: ProductVariant[];
};

export type FavoriteItem = {
  addedAt: string;
  product: FavoriteProduct;
};

export type FavoriteVariantStatus =
  ProductVariantStatus;
