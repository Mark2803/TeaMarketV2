import {
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  Share2,
  ShoppingCart
} from "lucide-react";

type ProductPurchaseProps = {
  quantity: number;
  favorite: boolean;
  disabled: boolean;
  isAdding: boolean;
  message: string | null;
  onDecrease: () => void;
  onIncrease: () => void;
  onToggleFavorite: () => void;
  onAddToCart: () => void;
  onShare: () => void;
};

export default function ProductPurchase(
  props: ProductPurchaseProps
) {
  return (
    <section className="product-purchase">
      <div className="product-purchase__quantity-row">
        <h2>
          Количество
        </h2>

        <div className="product-quantity">
          <button
            type="button"
            onClick={props.onDecrease}
            disabled={props.quantity <= 1}
            aria-label="Уменьшить количество"
          >
            <Minus size={17} />
          </button>

          <strong>
            {props.quantity}
          </strong>

          <button
            type="button"
            onClick={props.onIncrease}
            aria-label="Увеличить количество"
          >
            <Plus size={17} />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="product-add-cart"
        disabled={
          props.disabled
          || props.isAdding
        }
        onClick={props.onAddToCart}
      >
        {props.isAdding
          ? <LoaderCircle className="product-spin" size={21} />
          : <ShoppingCart size={21} />}

        {props.disabled
          ? "Нет в наличии"
          : props.isAdding
            ? "Добавляем..."
            : "Добавить в корзину"}
      </button>

      {props.message && (
        <p className="product-purchase__message">
          {props.message}
        </p>
      )}

      <div className="product-purchase__secondary">
        <button
          type="button"
          onClick={props.onToggleFavorite}
        >
          <Heart
            size={21}
            fill={
              props.favorite
                ? "currentColor"
                : "none"
            }
          />

          {props.favorite
            ? "В избранном"
            : "В избранное"}
        </button>

        <button
          type="button"
          onClick={props.onShare}
        >
          <Share2 size={20} />
          Поделиться
        </button>
      </div>
    </section>
  );
}
