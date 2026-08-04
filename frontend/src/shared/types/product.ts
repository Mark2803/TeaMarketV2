export type ProductImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  sku: string;
  weight_g: string;
  price: string;
  old_price: string | null;
  stock_quantity: number;
  is_available: boolean;
  status: string;
  sort_order: number;
};

export type ProductCategoryRelation = {
  sort_order: number;
  categories: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  };
};

export type ProductCollectionRelation = {
  sort_order: number;
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  };
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  is_active: boolean;
  tea_type: string | null;
  country: string | null;
  region: string | null;
  manufacturer: string | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export type ProductDetails = ProductListItem & {
  fermentation_level: string | null;
  product_form: string | null;
  about_tea: string | null;
  taste: string | null;
  aroma: string | null;
  effect: string | null;
  beneficial_properties: string | null;
  water_temperature_c: number | null;
  tea_amount_g: string | null;
  brewing_time_seconds: number | null;
  infusion_count: number | null;
  brewing_tips: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  is_indexed: boolean;
  product_categories: ProductCategoryRelation[];
  collection_products: ProductCollectionRelation[];
  relatedProducts: ProductListItem[];
  similarProducts: ProductListItem[];
};

export type ProductsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductsResponse = {
  data: ProductListItem[];
  pagination: ProductsPagination;
};

export type ProductDetailsResponse = {
  data: ProductDetails;
};
