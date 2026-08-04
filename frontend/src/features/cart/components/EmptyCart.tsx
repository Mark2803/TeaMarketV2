import {
  ShoppingBag
} from "lucide-react";

import {
  Link
} from "react-router-dom";

export default function EmptyCart() {
  return (
    <section className="empty-cart">
      <span className="empty-cart__icon">
        <ShoppingBag
          size={34}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </span>

      <h1>
        Корзина пока пуста
      </h1>

      <p>
        Добавьте чай из каталога, чтобы оформить заказ.
      </p>

      <Link
        to="/catalog"
        className="empty-cart__link"
      >
        Перейти в каталог
      </Link>
    </section>
  );
}
