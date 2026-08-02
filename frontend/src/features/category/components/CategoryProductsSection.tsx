import {
  ChevronDown,
  Grid2X2,
  ListFilter,
  SlidersHorizontal
} from "lucide-react";

import CategoryProductCard from "./CategoryProductCard";

import type {
  CategoryProduct
} from "../category.types";

type CategoryProductsSectionProps = {
  products: CategoryProduct[];
  productCount: number;
  currentSortLabel: string;
  onOpenFilters: () => void;
  onOpenSort: () => void;
};

export default function CategoryProductsSection({
  products,
  productCount,
  currentSortLabel,
  onOpenFilters,
  onOpenSort
}: CategoryProductsSectionProps) {
  return (
    <section className="category-products-section">
      <div className="category-products-toolbar">
        <button
          type="button"
          onClick={onOpenFilters}
        >
          <ListFilter
            size={18}
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span>
            Фильтры
          </span>

          <SlidersHorizontal
            size={17}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={onOpenSort}
        >
          <span>
            {currentSortLabel}
          </span>

          <ChevronDown
            size={17}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className="category-products-toolbar__view"
          aria-label="Показать сеткой"
        >
          <Grid2X2
            size={20}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        </button>
      </div>

      <p className="category-products-count">
        {productCount} товаров
      </p>

      <div className="category-product-grid">
        {products.map(
          (product) => (
            <CategoryProductCard
              key={product.slug}
              product={product}
            />
          )
        )}
      </div>
    </section>
  );
}
