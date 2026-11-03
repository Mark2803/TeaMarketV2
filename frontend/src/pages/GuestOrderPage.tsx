import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getAccessibleOrder, payAccessibleOrder } from "../shared/api/order-access";
import type { AccessibleOrder } from "../shared/api/order-access";
import { getSavedOrderAccess, saveOrderAccess } from "../features/checkout/order-access.storage";
import "../shared/styles/orders.css";

export default function GuestOrderPage() {
  const { orderId = "" } = useParams();
  const [params] = useSearchParams();
  const access = params.get("access") || getSavedOrderAccess(orderId);
  const [order, setOrder] = useState<AccessibleOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await getAccessibleOrder(orderId, access || undefined);
        if (!active) return;
        setOrder(response.data); setError("");
        if (access) saveOrderAccess({ id: orderId, orderNumber: response.data.order_number, accessToken: access });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Не удалось получить заказ"); }
      finally { if (active) setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderId, access]);
  const pay = async () => {
    if (!order || paying) return;
    setPaying(true); setError("");
    try {
      const response = await payAccessibleOrder(order.id, access || undefined);
      window.location.assign(response.data.confirmationUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось открыть оплату"); setPaying(false); }
  };
  const money = (v: string) => `${Number(v).toLocaleString("ru-RU")} ₽`;
  return <main className="orders-page" style={{ maxWidth: 760, margin: "32px auto", padding: 20 }}>
    <Link to="/profile/orders">← Мои заказы</Link>
    {loading ? <p>Проверяем статус заказа…</p> : !order ? <p>{error || "Заказ не найден"}</p> : <>
      <h1>Заказ № {order.order_number}</h1>
      <p><strong>{order.payment_status === "paid" ? "Оплачен" : order.status === "cancelled" ? "Отменён" : "Ожидает оплаты"}</strong></p>
      <div style={{ display: "grid", gap: 12, margin: "24px 0" }}>
        {order.order_items.map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>{item.product_name} × {item.quantity}</span><strong>{money(item.line_total)}</strong></div>)}
        <hr style={{ width: "100%" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Доставка</span><strong>{money(order.delivery_cost)}</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Итого</strong><strong>{money(order.total_amount)}</strong></div>
      </div>
      {order.order_deliveries?.length > 0 && <section aria-label="Отслеживание доставки" style={{ padding: "18px 20px", border: "1px solid #ded4c6", borderRadius: 12, margin: "20px 0" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Доставка</h2>
        {order.order_deliveries.map((delivery, index) => <div key={index} style={{ display: "grid", gap: 8 }}>
          <div><strong>Статус: </strong>{({pending:"Ожидает обработки",preparing:"Готовится к отправке",handed_over:"Передано перевозчику",shipped:"Передано перевозчику",in_transit:"В пути",delivered:"Доставлено",returned:"Возвращено",cancelled:"Отменено"} as Record<string,string>)[delivery.status] || delivery.status}</div>
          <div><strong>Служба доставки: </strong>{delivery.delivery_service || delivery.delivery_methods?.name || "Не указана"}</div>
          {delivery.tracking_number && <div><strong>Трек-номер: </strong><span style={{ userSelect: "all" }}>{delivery.tracking_number}</span></div>}
          <small style={{ color: "#746b60" }}>Статус обновляется по данным магазина.</small>
        </div>)}
      </section>}
      {order.payment_status !== "paid" && order.status !== "cancelled" && <button type="button" disabled={paying} onClick={() => void pay()} style={{ padding: "14px 24px", cursor: "pointer" }}>{paying ? "Открываем ЮKassa…" : "Оплатить заказ"}</button>}
      {order.payment_status === "paid" && <p>Спасибо! Оплата подтверждена.</p>}
      {error && <p role="alert">{error}</p>}
    </>}
  </main>;
}
