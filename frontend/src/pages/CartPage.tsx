import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CartItemCard from "../features/cart/components/CartItemCard";
import CartSummary from "../features/cart/components/CartSummary";
import EmptyCart from "../features/cart/components/EmptyCart";
import { useCart } from "../features/cart/useCart";
import { useAuth } from "../features/auth/AuthProvider";
import { getSavedOrders } from "../features/checkout/order-access.storage";
import { getAccessibleOrder, payAccessibleOrder } from "../shared/api/order-access";
import type { AccessibleOrder } from "../shared/api/order-access";
import { getCustomerOrders } from "../shared/api/orders";
import type { CustomerOrderListItemApi } from "../shared/api/orders";
import "../shared/styles/cart.css";

type PendingOrder = {
  id: string;
  number: string;
  amount: string;
  date: string;
  items: Array<{ name: string; quantity: number }>;
  link: string;
  access?: string;
};

function formatMoney(value: string): string {
  return `${Number(value).toLocaleString("ru-RU")} ₽`;
}

function PendingOrders({ authenticated }: { authenticated: boolean }) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (authenticated) {
        const response = await getCustomerOrders();
        setOrders(response.data
          .filter((o: CustomerOrderListItemApi) => o.payment_status !== "paid" && o.payment_status !== "refunded" && o.payment_status !== "partially_refunded" && o.status !== "cancelled")
          .map((o: CustomerOrderListItemApi) => ({
            id: o.id, number: o.order_number, amount: o.total_amount, date: o.ordered_at,
            items: o.order_items.map(item => ({ name: item.product_name, quantity: item.quantity })),
            link: `/profile/orders/${encodeURIComponent(o.order_number)}`
          })));
      } else {
        const saved = getSavedOrders();
        const results = await Promise.allSettled(saved.map(async (entry) => {
          const response = await getAccessibleOrder(entry.id, entry.accessToken);
          return { entry, order: response.data };
        }));
        const pending: PendingOrder[] = [];
        let failures = 0;
        for (const result of results) {
          if (result.status === "rejected") { failures++; continue; }
          const { entry, order } = result.value as { entry: typeof saved[number]; order: AccessibleOrder };
          if (order.payment_status === "paid" || order.status === "cancelled" || order.payment_status === "refunded") continue;
          pending.push({
            id: order.id, number: order.order_number, amount: order.total_amount, date: order.ordered_at,
            items: order.order_items.map(item => ({ name: item.product_name, quantity: item.quantity })),
            link: `/order/${encodeURIComponent(order.id)}`,
            access: entry.accessToken
          });
        }
        setOrders(pending);
        if (failures) setError(`Не удалось проверить ${failures} заказ(ов). Попробуйте обновить список.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    void load();
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const pay = async (order: PendingOrder) => {
    if (payingId) return;
    setPayingId(order.id);
    setError("");
    try {
      // Authenticated orders may be paid from their details page.
      if (!order.access) { window.location.assign(order.link); return; }
      const response = await payAccessibleOrder(order.id, order.access);
      if (!response.data.confirmationUrl) throw new Error("Ссылка на оплату не получена");
      window.location.assign(response.data.confirmationUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть оплату");
      setPayingId(null);
    }
  };

  return <section className="cart-pending" aria-label="Ожидают оплаты">
    <div className="cart-pending__heading">
      <h2>Ожидают оплаты</h2>
      <button type="button" onClick={() => void load()} disabled={loading}>Обновить</button>
    </div>
    {error && <p role="alert" className="cart-pending__error">{error}</p>}
    {loading ? <p>Проверяем статусы заказов…</p> : orders.length === 0 ? <div className="cart-pending__empty">
      <p>Заказов, ожидающих оплаты, пока нет.</p>
      {!authenticated && <p>Здесь отображаются заказы, оформленные в этом браузере. Если данные браузера были очищены, восстановить доступ можно по сохранённой ссылке на заказ.</p>}
    </div> : <div className="cart-pending__list">{orders.map(order => <article className="cart-pending__order" key={order.id}>
      <div className="cart-pending__order-top"><strong>Заказ № {order.number}</strong><span className="cart-pending__status">Ожидает оплаты</span></div>
      <p className="cart-pending__date">{new Date(order.date).toLocaleDateString("ru-RU")}</p>
      <div className="cart-pending__items">{order.items.map((item, index) => <div key={index}>{item.name} × {item.quantity}</div>)}</div>
      <div className="cart-pending__order-bottom"><strong>{formatMoney(order.amount)}</strong><div className="cart-pending__actions">
        <Link to={order.link}>Подробнее</Link>
        <button type="button" disabled={payingId !== null} onClick={() => void pay(order)}>{payingId === order.id ? "Открываем оплату…" : "Оплатить заказ"}</button>
      </div></div>
    </article>)}</div>}
  </section>;
}

export default function CartPage() {
  const { items, totalQuantity, totalAmount, isLoading, isMutating, error, refresh, updateQuantity, changeVariant, removeItem, clear } = useCart();
  const { session } = useAuth();
  const [tab, setTab] = useState<"cart" | "pending">("cart");

  return <div className="cart-page">
    <div className="cart-page__tabs" role="tablist" aria-label="Разделы корзины">
      <button type="button" role="tab" aria-selected={tab === "cart"} className={tab === "cart" ? "cart-page__tab--active" : ""} onClick={() => setTab("cart")}>Товары в корзине{!isLoading ? ` (${totalQuantity})` : ""}</button>
      <button type="button" role="tab" aria-selected={tab === "pending"} className={tab === "pending" ? "cart-page__tab--active" : ""} onClick={() => setTab("pending")}>Ожидают оплаты</button>
    </div>
    {tab === "pending" ? <PendingOrders authenticated={session.isAuthenticated} /> : isLoading ? <section className="cart-page product-page-state" aria-busy="true"><h1>Загружаем корзину</h1></section> : error && items.length === 0 ? <section className="cart-page product-page-state"><h1>Не удалось загрузить корзину</h1><p>{error}</p><button type="button" onClick={() => void refresh()}>Повторить запрос</button></section> : items.length === 0 ? <EmptyCart /> : <>
      <header className="cart-page__header"><div><p>Ваш выбор</p><h1>Корзина</h1><span>{totalQuantity} шт.</span></div><button type="button" disabled={isMutating} onClick={() => void clear()}>Очистить корзину</button></header>
      {error && <p role="alert">{error}</p>}
      <div className="cart-page__layout"><section className="cart-page__items">{items.map(item => <CartItemCard key={item.id} item={item} disabled={isMutating} onChangeVariant={changeVariant} onUpdateQuantity={updateQuantity} onRemove={removeItem} />)}<Link to="/catalog" className="cart-page__continue">Продолжить покупки</Link></section><CartSummary itemCount={totalQuantity} totalAmount={totalAmount} /></div>
    </>}
  </div>;
}
