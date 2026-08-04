import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart
} from "lucide-react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import {
  useCart
} from "../../cart/useCart";

type ProductToolbarProps = {
  favorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
};

export default function ProductToolbar({
  favorite,
  onToggleFavorite,
  onShare
}: ProductToolbarProps) {
  const navigate =
    useNavigate();

  const { totalQuantity } = useCart();

  return (
    <header className="product-toolbar">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Назад"
      >
        <ArrowLeft
          size={23}
          strokeWidth={1.7}
        />
      </button>

      <div className="product-toolbar__brand">
        <span>
          茶
        </span>

        <strong>
          ЧАЯ
        </strong>

        <small>
          производство
          <br />
          и продажа чая
        </small>
      </div>

      <div className="product-toolbar__actions">
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label="Избранное"
        >
          <Heart
            size={23}
            fill={
              favorite
                ? "currentColor"
                : "none"
            }
            strokeWidth={1.7}
          />
        </button>

        <button
          type="button"
          aria-label="Поделиться"
          onClick={onShare}
        >
          <Share2
            size={22}
            strokeWidth={1.7}
          />
        </button>

        <Link
          to="/cart"
          className="product-toolbar__cart"
          aria-label="Открыть корзину"
        >
          <ShoppingCart
            size={22}
            strokeWidth={1.7}
          />

          {totalQuantity > 0 && (
            <span className="cart-count-badge">
              {totalQuantity}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
