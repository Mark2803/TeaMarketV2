import {
  ChevronDown
} from "lucide-react";

import CategoryProductCard from "./CategoryProductCard";

import type {
  CategoryProduct
} from "../category.types";

type CategoryProductsSectionProps = {
  products: CategoryProduct[];
  productCount: number;
  currentSortLabel: string;
  onOpenSort: () => void;
  isLoading?: boolean;
};

export default function CategoryProductsSection({
  products,
  productCount,
  currentSortLabel,
  onOpenSort,
  isLoading = false
}: CategoryProductsSectionProps) {
  return (
    <section className="category-products-section">
      <div className="category-products-toolbar category-products-toolbar--sort-only">
        <button
          type="button"
          onClick={onOpenSort}
        >
          <span>{currentSortLabel}</span>
          <ChevronDown
            size={17}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        </button>
      </div>

      <p className="category-products-count">
        {isLoading
          ? "Загрузка товаров…"
          : `${productCount} товаров`}
      </p>

      {!isLoading && products.length === 0 ? (
        <div className="category-products-empty">
          В этом разделе пока нет товаров.
        </div>
      ) : (
        <div className="category-product-grid">
          {products.map((product) => (
            <CategoryProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </section>
  );
}
