import { useMemo, useState } from "react";

import BackLink from "../shared/components/BackLink";
import CatalogPanel from "../features/category/components/CatalogPanel";
import CategoryProductsSection from "../features/category/components/CategoryProductsSection";
import { mapProductToCategoryCard } from "../features/category/category.mapper";
import { sortOptions } from "../features/category/category.options";
import type { ActiveCatalogPanel } from "../features/category/category.types";
import { useProducts } from "../shared/hooks/useProducts";

export default function NewProductsPage() {
  const [activePanel, setActivePanel] = useState<ActiveCatalogPanel>(null);
  const [sortValue, setSortValue] =
    useState<"newest" | "name-asc" | "name-desc">("newest");

  const productsQuery = useProducts({
    page: 1,
    limit: 100,
    sort: sortValue,
    isNew: true
  });

  const products = useMemo(
    () => (productsQuery.data?.data ?? []).map(mapProductToCategoryCard),
    [productsQuery.data]
  );

  const currentSortLabel = sortOptions.find(
    (option) => option.value === sortValue
  )?.title ?? "Сортировка";

  return (
    <div className="category-page">
      <BackLink to="/" label="Главная" />
      <header className="catalog-page__heading">
        <p>Актуальные поступления</p>
        <h1>Новинки</h1>
      </header>

      <CategoryProductsSection
        products={products}
        productCount={productsQuery.data?.pagination.total ?? 0}
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
