import {
  Heart,
  ShoppingCart
} from "lucide-react";

import {
  useMemo,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import type {
  FavoriteProduct
} from "../favorites.types";

import {
  useCart
} from "../../cart/useCart";

type FavoriteProductCardProps = {
  product: FavoriteProduct;
  onRemove: (productId: string) => void;
};

export default function FavoriteProductCard({
  product,
  onRemove
}: FavoriteProductCardProps) {
  const firstAvailableVariant =
    product.variants.find(
      (variant) =>
        variant.status !== "unavailable"
    )
    ?? product.variants[0];

  const [selectedVariantId, setSelectedVariantId] =
    useState(firstAvailableVariant?.id ?? "");

  const [message, setMessage] =
    useState<string | null>(null);

  const {
    addItem,
    isMutating: isAddingToCart
  } = useCart();

  const selectedVariant = useMemo(
    () =>
      product.variants.find(
        (variant) =>
          variant.id === selectedVariantId
      )
      ?? firstAvailableVariant,
    [
      firstAvailableVariant,
      product.variants,
      selectedVariantId
    ]
  );

  const image = product.image;

  const addToCart = async () => {
    if (
      !selectedVariant
      || selectedVariant.status === "unavailable"
    ) {
      return;
    }

    setMessage(null);

    try {
      await addItem(
        selectedVariant.id,
        1
      );

      setMessage("Добавлено в корзину");
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось добавить товар"
      );
    }
  };

  return (
    <article className="favorite-product-card">
      <div className="favorite-product-card__media">
        <Link
          to={`/products/${product.slug}`}
          aria-label={`Открыть товар ${product.name}`}
        >
          {image ? (
            <img
              src={image.url}
              alt={image.alt}
            />
          ) : (
            <span>
              Изображение не добавлено
            </span>
          )}
        </Link>

        <button
          type="button"
          className="favorite-product-card__remove"
          aria-label={`Удалить ${product.name} из избранного`}
          onClick={() => onRemove(product.id)}
        >
          <Heart
            size={19}
            fill="currentColor"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="favorite-product-card__body">
        <Link
          to={`/products/${product.slug}`}
          className="favorite-product-card__main-link"
        >
          <h2>
            {product.name}
          </h2>

          <p>
            {product.subtitle}
          </p>
        </Link>

        <label className="favorite-product-card__variant">
          <span>
            Вес
          </span>

          <select
            value={selectedVariantId}
            onChange={(event) => {
              setSelectedVariantId(
                event.target.value
              );
              setMessage(null);
            }}
          >
            {product.variants.map((variant) => (
              <option
                key={variant.id}
                value={variant.id}
                disabled={
                  variant.status === "unavailable"
                }
              >
                {variant.label}
                {variant.status === "unavailable"
                  ? " — нет в наличии"
                  : ` — ${variant.price.toLocaleString("ru-RU")} ₽`}
              </option>
            ))}
          </select>
        </label>

        <div className="favorite-product-card__footer">
          <div>
            {selectedVariant?.oldPrice && (
              <del>
                {selectedVariant.oldPrice.toLocaleString("ru-RU")} ₽
              </del>
            )}

            <strong>
              {selectedVariant
                ? `${selectedVariant.price.toLocaleString("ru-RU")} ₽`
                : "Цена не указана"}
            </strong>
          </div>

          <button
            type="button"
            className="favorite-product-card__cart"
            disabled={
              isAddingToCart
              || !selectedVariant
              || selectedVariant.status === "unavailable"
            }
            onClick={() => {
              void addToCart();
            }}
          >
            <ShoppingCart
              size={19}
              aria-hidden="true"
            />

            <span>
              В корзину
            </span>
          </button>
        </div>

        {message && (
          <p
            className="favorite-product-card__message"
            role="status"
          >
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
