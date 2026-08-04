import {
  Heart,
  Leaf
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import {
  useFavorites
} from "../../favorites/useFavorites";

import type {
  CategoryProduct
} from "../category.types";

type CategoryProductCardProps = {
  product: CategoryProduct;
};

export default function CategoryProductCard({
  product
}: CategoryProductCardProps) {
  const {
    isFavorite,
    toggle,
    isMutating
  } = useFavorites();

  const productId =
    product.id ?? "";

  const favorite =
    productId.length > 0
    && isFavorite(productId);

  return (
    <article className="category-product-card">
      <Link
        to={`/products/${product.slug}`}
        className="category-product-card__link"
        aria-label={`Открыть товар ${product.name}`}
      />

      <div className="category-product-card__image">
        {product.badge && (
          <span className="category-product-card__badge">
            {product.badge}
          </span>
        )}

        <button
          type="button"
          className="category-product-card__favorite"
          aria-label={
            favorite
              ? `Удалить ${product.name} из избранного`
              : `Добавить ${product.name} в избранное`
          }
          aria-pressed={favorite}
          disabled={
            isMutating
            || productId.length === 0
          }
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (productId) {
              void toggle(productId);
            }
          }}
        >
          <Heart
            size={18}
            strokeWidth={1.6}
            fill={favorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
          />
        ) : (
          <Leaf
            size={48}
            strokeWidth={1.1}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="category-product-card__body">
        <h3>{product.name}</h3>
        <p>{product.details}</p>
        <span>{product.weight}</span>

        <div className="category-product-card__footer">
          <strong>от {product.price}</strong>
        </div>
      </div>
    </article>
  );
}
