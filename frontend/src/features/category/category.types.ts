export type SortOption = {
  value: string;
  title: string;
  description: string;
};

export type CategoryProduct = {
  id?: string;
  slug: string;
  name: string;
  details: string;
  weight: string;
  price: string;
  badge: string | null;

  /*
   * Поля ниже оставлены временно для совместимости
   * со старым локальным поисковым индексом.
   * Каталог и категории их больше не используют.
   */
  subcategory?: string;
  imageClass?: string;

  imageUrl?: string | null;
  imageAlt?: string;
};

export type CategoryDefinition = {
  name: string;
  description: string;
  productCount: number;
  subcategories: string[];
  products: CategoryProduct[];
};

export type ActiveCatalogPanel = "sort" | null;
