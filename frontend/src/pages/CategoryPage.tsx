import {
  useMemo,
  useState
} from "react";

import {
  Navigate,
  useParams
} from "react-router-dom";

import BackLink from "../shared/components/BackLink";
import CatalogPanel from "../features/category/components/CatalogPanel";
import CategoryIntro from "../features/category/components/CategoryIntro";
import CategoryProductsSection from "../features/category/components/CategoryProductsSection";
import CategorySubcategories from "../features/category/components/CategorySubcategories";

import {
  mapProductToCategoryCard
} from "../features/category/category.mapper";

import {
  sortOptions
} from "../features/category/category.options";

import type {
  ActiveCatalogPanel
} from "../features/category/category.types";

import {
  useCategory,
  useCategoryProducts
} from "../shared/hooks/useCatalog";

export default function CategoryPage() {
  const { categorySlug = "" } =
    useParams<{ categorySlug: string }>();

  const [isDescriptionOpen, setIsDescriptionOpen] =
    useState(false);
  const [activePanel, setActivePanel] =
    useState<ActiveCatalogPanel>(null);
  const [sortValue, setSortValue] =
    useState<"newest" | "name-asc" | "name-desc">("newest");
  const [activeSubcategorySlug, setActiveSubcategorySlug] =
    useState<string | null>(null);

  const categoryQuery =
    useCategory(categorySlug);

  const productsSlug =
    activeSubcategorySlug ?? categorySlug;

  const productsQuery =
    useCategoryProducts(
      productsSlug,
      {
        page: 1,
        limit: 100,
        sort: sortValue
      }
    );

  const products = useMemo(
    () =>
      (productsQuery.data?.data ?? [])
        .map(mapProductToCategoryCard),
    [productsQuery.data]
  );

  const currentSortLabel =
    sortOptions.find(
      (option) => option.value === sortValue
    )?.title ?? "Сортировка";

  if (
    categoryQuery.isError
    && categoryQuery.error.message === "Категория не найдена"
  ) {
    return <Navigate to="/404" replace />;
  }

  if (categoryQuery.isLoading) {
    return (
      <div className="catalog-state">
        Загрузка категории…
      </div>
    );
  }

  if (categoryQuery.isError || !categoryQuery.data) {
    return (
      <div className="catalog-state catalog-state--error">
        {categoryQuery.error?.message
          ?? "Не удалось загрузить категорию"}
      </div>
    );
  }

  const category = categoryQuery.data.data;

  return (
    <div className="category-page">
      <BackLink to="/catalog" label="Каталог" />
      <CategoryIntro
        categoryName={category.name}
        description={category.description ?? ""}
        imageUrl={category.image_url}
        isDescriptionOpen={isDescriptionOpen}
        onToggleDescription={() =>
          setIsDescriptionOpen((value) => !value)
        }
      />

      {category.other_categories.length > 0 && (
        <CategorySubcategories
          items={category.other_categories}
          activeSlug={activeSubcategorySlug}
          onSelect={(slug) =>
            setActiveSubcategorySlug(
              (current) =>
                current === slug ? null : slug
            )
          }
        />
      )}

      <CategoryProductsSection
        products={products}
        productCount={
          productsQuery.data?.pagination.total ?? 0
        }
        currentSortLabel={currentSortLabel}
        onOpenSort={() => setActivePanel("sort")}
        isLoading={productsQuery.isLoading}
      />

      {productsQuery.isError && (
        <div className="catalog-state catalog-state--error">
          {productsQuery.error.message}
        </div>
      )}

      {activePanel && (
        <CatalogPanel
          activePanel={activePanel}
          sortValue={sortValue}
          onSortChange={(value) => {
            setSortValue(value);
            setActivePanel(null);
          }}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
