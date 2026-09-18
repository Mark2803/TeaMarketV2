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
  useCollection,
  useCollectionProducts
} from "../shared/hooks/useCatalog";

export default function CollectionPage() {
  const { collectionSlug = "" } =
    useParams<{ collectionSlug: string }>();

  const [isDescriptionOpen, setIsDescriptionOpen] =
    useState(false);
  const [activePanel, setActivePanel] =
    useState<ActiveCatalogPanel>(null);
  const [sortValue, setSortValue] =
    useState<"newest" | "name-asc" | "name-desc">("newest");

  const collectionQuery =
    useCollection(collectionSlug);
  const productsQuery =
    useCollectionProducts(
      collectionSlug,
      { page: 1, limit: 100, sort: sortValue }
    );

  const products = useMemo(
    () =>
      (productsQuery.data?.data ?? [])
        .map(mapProductToCategoryCard),
    [productsQuery.data]
  );

  if (
    collectionQuery.isError
    && collectionQuery.error.message === "Подборка не найдена"
  ) {
    return <Navigate to="/404" replace />;
  }

  if (collectionQuery.isLoading) {
    return <div className="catalog-state">Загрузка подборки…</div>;
  }

  if (collectionQuery.isError || !collectionQuery.data) {
    return (
      <div className="catalog-state catalog-state--error">
        {collectionQuery.error?.message
          ?? "Не удалось загрузить подборку"}
      </div>
    );
  }

  const collection = collectionQuery.data.data;
  const currentSortLabel =
    sortOptions.find(
      (option) => option.value === sortValue
    )?.title ?? "Сортировка";

  return (
    <div className="category-page">
      <BackLink to="/collections" label="Подборки" />
      <CategoryIntro
        categoryName={collection.name}
        description={collection.description ?? ""}
        imageUrl={collection.image_url}
        isDescriptionOpen={isDescriptionOpen}
        onToggleDescription={() =>
          setIsDescriptionOpen((value) => !value)
        }
      />

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
