import {
  Heart,
  ShoppingCart
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import type {
  CategoryProduct
} from "../category.types";

type CategoryProductCardProps = {
  product: CategoryProduct;
};

export default function CategoryProductCard({
  product
}: CategoryProductCardProps) {
  const productUrl =
    `/products/${product.slug}`;

  return (
    <article className="category-product-card">
      <Link
        to={productUrl}
        className="category-product-card__link"
        aria-label={`Открыть товар ${product.name}`}
      />

      <div
        className={`category-product-card__image ${product.imageClass}`}
        aria-hidden="true"
      >
        {product.badge && (
          <span className="category-product-card__badge">
            {product.badge}
          </span>
        )}

        <button
          type="button"
          className="category-product-card__favorite"
          aria-label={`Добавить ${product.name} в избранное`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Heart
            size={18}
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </button>

        <span className="category-product-card__tea-shape" />
      </div>

      <div className="category-product-card__body">
        <h3>
          {product.name}
        </h3>

        <p>
          {product.details}
        </p>

        <span>
          {product.weight}
        </span>

        <div className="category-product-card__footer">
          <strong>
            от {product.price}
          </strong>

          <button
            type="button"
            aria-label={`Добавить ${product.name} в корзину`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <ShoppingCart
              size={18}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </article>
  );
}
