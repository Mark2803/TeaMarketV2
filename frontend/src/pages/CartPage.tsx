import "../shared/styles/cart.css";

import {
  Link
} from "react-router-dom";

import CartItemCard from "../features/cart/components/CartItemCard";
import CartSummary from "../features/cart/components/CartSummary";
import EmptyCart from "../features/cart/components/EmptyCart";

import {
  useCart
} from "../features/cart/useCart";

export default function CartPage() {
  const {
    items,
    totalQuantity,
    totalAmount,
    isLoading,
    isMutating,
    error,
    refresh,
    updateQuantity,
    changeVariant,
    removeItem,
    clear
  } = useCart();

  if (isLoading) {
    return (
      <section
        className="cart-page product-page-state"
        aria-busy="true"
      >
        <h1>Загружаем корзину</h1>
      </section>
    );
  }

  if (error && items.length === 0) {
    return (
      <section className="cart-page product-page-state">
        <h1>Не удалось загрузить корзину</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
        >
          Повторить запрос
        </button>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <header className="cart-page__header">
        <div>
          <p>Ваш выбор</p>
          <h1>Корзина</h1>
          <span>
            {totalQuantity} шт.
          </span>
        </div>

        <button
          type="button"
          disabled={isMutating}
          onClick={() => {
            void clear();
          }}
        >
          Очистить корзину
        </button>
      </header>

      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      <div className="cart-page__layout">
        <section className="cart-page__items">
          {items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              disabled={isMutating}
              onChangeVariant={changeVariant}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}

          <Link
            to="/catalog"
            className="cart-page__continue"
          >
            Продолжить покупки
          </Link>
        </section>

        <CartSummary
          itemCount={totalQuantity}
          totalAmount={totalAmount}
        />
      </div>
    </div>
  );
}
