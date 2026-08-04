import {
  Minus,
  Plus,
  Trash2
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import type {
  CartItem
} from "../cart.types";

type CartItemCardProps = {
  item: CartItem;
  disabled: boolean;
  onChangeVariant: (
    itemId: string,
    variantId: string
  ) => Promise<unknown>;
  onUpdateQuantity: (
    itemId: string,
    quantity: number
  ) => Promise<unknown>;
  onRemove: (
    itemId: string
  ) => Promise<unknown>;
};

export default function CartItemCard({
  item,
  disabled,
  onChangeVariant,
  onUpdateQuantity,
  onRemove
}: CartItemCardProps) {
  const {
    product,
    variant
  } = item;

  const unitPrice = Number(
    variant.price
  );

  const lineTotal = Number(
    item.lineTotal
  );

  const activeVariants =
    product.variants.filter(
      (candidate) =>
        candidate.isAvailable
        && candidate.stockQuantity > 0
    );

  return (
    <article className="cart-item-card">
      <Link
        to={`/products/${product.slug}`}
        className="cart-item-card__media"
        aria-label={`Открыть ${product.name}`}
      >
        {product.image ? (
          <img
            src={product.image.url}
            alt={
              product.image.alt_text
              ?? product.name
            }
          />
        ) : (
          <span>
            Изображение не добавлено
          </span>
        )}
      </Link>

      <div className="cart-item-card__content">
        <div className="cart-item-card__heading">
          <Link to={`/products/${product.slug}`}>
            <h2>{product.name}</h2>
          </Link>

          <button
            type="button"
            className="cart-item-card__remove"
            aria-label={`Удалить ${product.name}`}
            disabled={disabled}
            onClick={() => {
              void onRemove(item.id);
            }}
          >
            <Trash2
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>

        {product.shortDescription && (
          <p className="cart-item-card__subtitle">
            {product.shortDescription}
          </p>
        )}

        <div className="cart-item-card__controls">
          <label>
            <span>Вес</span>

            <select
              value={variant.id}
              disabled={disabled}
              onChange={(event) => {
                void onChangeVariant(
                  item.id,
                  event.target.value
                );
              }}
            >
              {activeVariants.map(
                (candidate) => (
                  <option
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {candidate.weightG} г — {Number(
                      candidate.price
                    ).toLocaleString("ru-RU")} ₽
                  </option>
                )
              )}
            </select>
          </label>

          <div className="cart-item-card__quantity">
            <span>Количество</span>

            <div>
              <button
                type="button"
                aria-label="Уменьшить количество"
                disabled={
                  disabled
                  || item.quantity <= 1
                }
                onClick={() => {
                  void onUpdateQuantity(
                    item.id,
                    item.quantity - 1
                  );
                }}
              >
                <Minus size={16} />
              </button>

              <strong>{item.quantity}</strong>

              <button
                type="button"
                aria-label="Увеличить количество"
                disabled={
                  disabled
                  || item.quantity
                    >= variant.stockQuantity
                }
                onClick={() => {
                  void onUpdateQuantity(
                    item.id,
                    item.quantity + 1
                  );
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="cart-item-card__meta">
          <span>
            Артикул: {variant.sku}
          </span>

          <span
            className={
              variant.stockQuantity <= 5
                ? "cart-item-card__stock cart-item-card__stock--low"
                : "cart-item-card__stock"
            }
          >
            {variant.stockQuantity <= 5
              ? `Осталось ${variant.stockQuantity} шт.`
              : "В наличии"}
          </span>
        </div>

        <div className="cart-item-card__price">
          <span>
            {unitPrice.toLocaleString("ru-RU")} ₽ × {item.quantity}
          </span>

          <strong>
            {lineTotal.toLocaleString("ru-RU")} ₽
          </strong>
        </div>
      </div>
    </article>
  );
}
