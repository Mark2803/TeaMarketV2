export type SortOption = {
  value: string;
  title: string;
  description: string;
};

export type CategoryProduct = {
  slug: string;
  name: string;
  details: string;
  weight: string;
  price: string;
  badge: string | null;
  imageClass: string;
};

export type CategoryDefinition = {
  name: string;
  description: string;
  productCount: number;
  subcategories: string[];
  products: CategoryProduct[];
};

export type ActiveCatalogPanel = "filters" | "sort" | null;
