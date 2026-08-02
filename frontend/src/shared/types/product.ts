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

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  is_active: boolean;
  tea_type: string | null;
  country: string | null;
  region: string | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
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