import type {
  ProductListItem,
  ProductsPagination
} from "./product";

export type CatalogCategory = {
  id: string;
  parent_category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  product_count: number;
  other_categories: CatalogCategory[];
};

export type CatalogCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  collection_type: string;
  show_on_home: boolean;
  sort_order: number;
  product_count: number;
};

export type CategoriesResponse = {
  data: CatalogCategory[];
};

export type CategoryResponse = {
  data: CatalogCategory;
};

export type CategoryProductsResponse = {
  data: ProductListItem[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  pagination: ProductsPagination;
};

export type CollectionsResponse = {
  data: CatalogCollection[];
};

export type CollectionResponse = {
  data: CatalogCollection;
};

export type CollectionProductsResponse = {
  data: ProductListItem[];
  collection: {
    id: string;
    name: string;
    slug: string;
  };
  pagination: ProductsPagination;
};
