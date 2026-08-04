export type ProductVariantStatus =
  | "available"
  | "low"
  | "unavailable";

export type ProductVariant = {
  id: string;
  sku: string;
  label: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  status: ProductVariantStatus;
};

export type ProductRecommendation = {
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  imageAlt: string;
};

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  rating: string;
  reviews: number;
  article: string;
  country: string;
  region: string;
  producer: string;
  teaType: string;
  fermentation: string;
  form: string;
  images: {
    url: string;
    alt: string;
  }[];
  variants: ProductVariant[];
  aboutTea: string;
  taste: string;
  aroma: string;
  effect: string;
  beneficialProperties: string;
  brewing: {
    waterTemperature: string;
    teaAmount: string;
    brewingTime: string;
    infusionCount: string;
    tips: string;
  };
  relatedProducts: ProductRecommendation[];
  similarProducts: ProductRecommendation[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string | null;
  isIndexed: boolean;
};
