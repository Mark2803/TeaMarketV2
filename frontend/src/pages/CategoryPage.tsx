import {
  useMemo,
  useState
} from "react";

import {
  useParams
} from "react-router-dom";

import CatalogPanel from "../features/category/components/CatalogPanel";
import CategoryIntro from "../features/category/components/CategoryIntro";
import CategoryProductsSection from "../features/category/components/CategoryProductsSection";
import CategorySubcategories from "../features/category/components/CategorySubcategories";
import CategoryToolbar from "../features/category/components/CategoryToolbar";

import {
  categoryCatalog,
  defaultCategory,
  sortOptions
} from "../features/category/category.data";

import type {
  ActiveCatalogPanel
} from "../features/category/category.types";

export default function CategoryPage() {
  const {
    categorySlug = "oolong"
  } = useParams<{
    categorySlug: string;
  }>();

  const category =
    categoryCatalog[categorySlug]
    ?? defaultCategory;

  const [isDescriptionOpen, setIsDescriptionOpen] =
    useState(false);

  const [activePanel, setActivePanel] =
    useState<ActiveCatalogPanel>(null);

  const [sortValue, setSortValue] =
    useState("popular");

  const currentSortLabel = useMemo(
    () =>
      sortOptions.find(
        (option) => option.value === sortValue
      )?.title ?? "Сортировка",
    [sortValue]
  );

  return (
    <div className="category-page">
      <CategoryToolbar
        categoryName={category.name}
      />

      <CategoryIntro
        categoryName={category.name}
        description={category.description}
        isDescriptionOpen={isDescriptionOpen}
        onToggleDescription={() =>
          setIsDescriptionOpen((value) => !value)
        }
      />

      <CategorySubcategories
        items={category.subcategories}
      />

      <CategoryProductsSection
        products={category.products}
        productCount={category.productCount}
        currentSortLabel={currentSortLabel}
        onOpenFilters={() => setActivePanel("filters")}
        onOpenSort={() => setActivePanel("sort")}
      />

      {activePanel && (
        <CatalogPanel
          activePanel={activePanel}
          sortValue={sortValue}
          onSortChange={setSortValue}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
