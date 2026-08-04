import {
  Link
} from "react-router-dom";

type CartSummaryProps = {
  itemCount: number;
  totalAmount: number;
};

export default function CartSummary({
  itemCount,
  totalAmount
}: CartSummaryProps) {
  return (
    <aside className="cart-summary">
      <h2>Ваш заказ</h2>

      <dl className="cart-summary__totals">
        <div>
          <dt>Товары, {itemCount} шт.</dt>
          <dd>
            {totalAmount.toLocaleString("ru-RU")} ₽
          </dd>
        </div>

        <div>
          <dt>Доставка</dt>
          <dd>Рассчитаем при оформлении</dd>
        </div>

        <div className="cart-summary__total">
          <dt>Товары</dt>
          <dd>
            {totalAmount.toLocaleString("ru-RU")} ₽
          </dd>
        </div>
      </dl>

      <Link
        to="/checkout"
        className="cart-summary__checkout"
      >
        Перейти к оформлению
      </Link>

      <p className="cart-summary__notice">
        Цена, наличие и доступное количество получены из базы данных и будут проверены повторно при создании заказа.
      </p>
    </aside>
  );
}
