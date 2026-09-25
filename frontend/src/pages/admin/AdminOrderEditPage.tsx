import { Archive, ArchiveRestore, ArrowLeft, Ban, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAdminOrder,
  updateAdminOrderArchive,
  updateAdminOrderDelivery,
  updateAdminOrderPayment,
  updateAdminOrderStatus,
} from "../../shared/api/admin";
import type {
  AdminDeliveryStatus,
  AdminOrderDetails,
  AdminOrderStatus,
  AdminPaymentOperationStatus,
} from "../../shared/api/admin";

const money=(v:string|number)=>`${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(v)||0)} ₽`;
const date=(v:string|null|undefined)=>v?new Intl.DateTimeFormat("ru-RU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";
const orderLabels:Record<AdminOrderStatus,string>={new:"Новый",confirmed:"Подтверждён",processing:"В обработке",shipped:"Отправлен",completed:"Завершён",cancelled:"Отменён"};
const deliveryLabels:Record<AdminDeliveryStatus,string>={pending:"Ожидает",preparing:"Готовится",handed_over:"Передан службе",in_transit:"В пути",delivered:"Доставлен",returned:"Возвращён",cancelled:"Отменён"};
const paymentLabels:Record<AdminPaymentOperationStatus,string>={pending:"Ожидает",succeeded:"Успешно",failed:"Ошибка",cancelled:"Отменена",refunded:"Возврат"};

export default function AdminOrderEditPage(){
  const{orderNumber}=useParams();
  const nav=useNavigate();
  const[o,setO]=useState<AdminOrderDetails|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[msg,setMsg]=useState("");
  const[busy,setBusy]=useState("");
  const[orderStatus,setOrderStatus]=useState<AdminOrderStatus>("new");
  const[cancellationReason,setCancellationReason]=useState("");
  const[deliveryStatus,setDeliveryStatus]=useState<AdminDeliveryStatus>("pending");
  const[service,setService]=useState("");
  const[tracking,setTracking]=useState("");
  const[paymentStatus,setPaymentStatus]=useState<AdminPaymentOperationStatus>("pending");
  const[operation,setOperation]=useState("");

  const load=async()=>{
    if(!orderNumber)return;
    setLoading(true);
    try{
      const r=await getAdminOrder(orderNumber);
      setO(r.data);
      setOrderStatus(r.data.status);
      setCancellationReason(r.data.cancellation_reason??"");
      if(r.data.order_deliveries){
        setDeliveryStatus(r.data.order_deliveries.status);
        setService(r.data.order_deliveries.delivery_service??"");
        setTracking(r.data.order_deliveries.tracking_number??"");
      }
      const p=r.data.order_payments.at(-1);
      if(p){
        setPaymentStatus(p.status);
        setOperation(p.operation_number??"");
      }
    }catch{
      setError("Не удалось загрузить заказ.");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{void load()},[orderNumber]);

  const run=async(key:string,fn:()=>Promise<unknown>,success="Изменения сохранены.")=>{
    setBusy(key);setError("");setMsg("");
    try{await fn();setMsg(success);await load()}
    catch{setError("Не удалось сохранить изменения.")}
    finally{setBusy("")}
  };

  const saveOrderStatus=()=>{
    if(orderStatus==="cancelled"&&!cancellationReason.trim()){
      setError("Укажите причину отмены заказа.");
      return;
    }
    void run(
      "order",
      ()=>updateAdminOrderStatus(
        o!.order_number,
        orderStatus,
        orderStatus==="cancelled"?cancellationReason.trim():null
      ),
      orderStatus==="cancelled"?"Заказ отменён.":"Статус заказа сохранён."
    );
  };

  const cancelOrder=()=>{
    setOrderStatus("cancelled");
    setError("");
    document.getElementById("admin-cancellation-reason")?.focus();
  };

  if(loading)return <div className="admin-products-state">Загрузка заказа…</div>;
  if(!o)return <div className="admin-editor-message is-error">{error||"Заказ не найден."}</div>;

  const d=o.order_deliveries,p=o.order_payments.at(-1);

  return <section className="admin-order-edit-page">
    <div className="admin-page-heading admin-order-heading">
      <div>
        <button className="admin-order-back-link" onClick={()=>nav("/admin/orders")}>
          <ArrowLeft size={18}/>Заказы
        </button>
        <div className="admin-order-title-line">
          <h1>Заказ № {o.order_number}</h1>
          {o.is_archived&&<span className="admin-order-archive-mark">В архиве</span>}
        </div>
        <p>Создан {date(o.ordered_at)}{o.archived_at?` · Архивирован ${date(o.archived_at)}`:""}</p>
      </div>
    </div>

    {msg&&<div className="admin-editor-message is-success">{msg}</div>}
    {error&&<div className="admin-editor-message is-error">{error}</div>}

    <div className="admin-order-layout">
      <main>
        <section className="admin-editor-card">
          <h2>Состав заказа</h2>
          <div className="admin-order-items">{o.order_items.map(i=><div key={i.id}><div><strong>{i.product_name}</strong><span>SKU {i.sku} · {Number(i.weight_g)} г · {i.quantity} шт.</span></div><div>{money(i.unit_price)} × {i.quantity}<strong>{money(i.line_total)}</strong></div></div>)}</div>
          <div className="admin-order-totals"><span>Товары до скидок <strong>{money(o.gross_items_total)}</strong></span>{Number(o.discount_total)>0&&<span>Скидка <strong>−{money(o.discount_total)}</strong></span>}<span>Товары после скидок <strong>{money(o.items_total)}</strong></span><span>Доставка <strong>{money(o.delivery_cost)}</strong></span><span className="total">Итого <strong>{money(o.total_amount)}</strong></span></div>{o.order_discounts?.length>0&&<div className="admin-order-comment"><span>Применённые скидки</span>{o.order_discounts.map(x=><p key={x.id}>{x.name}{x.code?` (${x.code})`:""}: −{money(x.amount)}</p>)}</div>}
        </section>

        <section className="admin-editor-card">
          <h2>Покупатель</h2>
          <div className="admin-order-info-grid"><div><span>Имя</span><strong>{o.customer_name}</strong></div><div><span>Телефон</span><strong>{o.phone}</strong></div><div><span>Email</span><strong>{o.email||"—"}</strong></div><div><span>Тип</span><strong>{o.customer_id?"Зарегистрированный":"Гость"}</strong></div></div>
          {o.comment&&<div className="admin-order-comment"><span>Комментарий к заказу</span><p>{o.comment}</p></div>}
          {o.cancellation_reason&&<div className="admin-order-comment is-cancelled"><span>Причина отмены</span><p>{o.cancellation_reason}</p></div>}
        </section>

        <section className="admin-editor-card">
          <h2>Доставка</h2>
          {d?<><div className="admin-order-info-grid"><div><span>Способ</span><strong>{d.delivery_methods.name}</strong></div><div><span>Получатель</span><strong>{d.recipient_name}</strong></div><div className="wide"><span>Адрес / ПВЗ</span><strong>{d.full_address}</strong></div><div><span>Телефон</span><strong>{d.phone}</strong></div><div><span>Стоимость</span><strong>{money(d.cost)}</strong></div></div>{d.comment&&<div className="admin-order-comment"><span>Комментарий к доставке</span><p>{d.comment}</p></div>}</>:<p>Доставка для заказа не найдена.</p>}
        </section>

        <section className="admin-editor-card">
          <h2>История статусов</h2>
          {o.order_status_history.length?<div className="admin-order-history">{o.order_status_history.map((h,i)=><div key={h.id??i}><span>{date(h.changed_at)}</span><strong>{orderLabels[h.new_status as AdminOrderStatus]??h.new_status}</strong></div>)}</div>:<p>История изменений пока пуста.</p>}
        </section>
      </main>

      <aside>
        <section className="admin-editor-card admin-order-control">
          <h2>Статус заказа</h2>
          <select value={orderStatus} onChange={e=>setOrderStatus(e.target.value as AdminOrderStatus)}>{Object.entries(orderLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          {orderStatus==="cancelled"&&<label><span>Причина отмены *</span><textarea id="admin-cancellation-reason" rows={4} value={cancellationReason} onChange={e=>setCancellationReason(e.target.value)} placeholder="Например: покупатель отказался от заказа"/></label>}
          <button className="admin-primary-button" disabled={!!busy} onClick={saveOrderStatus}><Save size={16}/>{busy==="order"?"Сохранение…":"Сохранить статус"}</button>
          {o.status!=="cancelled"&&<button className="admin-danger-outline-button" disabled={!!busy} onClick={cancelOrder}><Ban size={16}/>Отменить заказ</button>}
        </section>

        <section className="admin-editor-card admin-order-control">
          <h2>Архив</h2>
          <p className="admin-order-control-note">{o.is_archived?"Заказ скрыт из списка активных заказов. Данные заказа сохранены.":"Архивирование не удаляет заказ и его историю."}</p>
          <button className="admin-secondary-button admin-order-full-button" disabled={!!busy} onClick={()=>run("archive",()=>updateAdminOrderArchive(o.order_number,!o.is_archived),o.is_archived?"Заказ восстановлен из архива.":"Заказ перемещён в архив.")}>
            {o.is_archived?<ArchiveRestore size={16}/>:<Archive size={16}/>}
            {busy==="archive"?"Сохранение…":o.is_archived?"Восстановить из архива":"Переместить в архив"}
          </button>
        </section>

        <section className="admin-editor-card admin-order-control">
          <h2>Доставка</h2>
          {d?<><label><span>Статус</span><select value={deliveryStatus} onChange={e=>setDeliveryStatus(e.target.value as AdminDeliveryStatus)}>{Object.entries(deliveryLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Служба доставки</span><input value={service} onChange={e=>setService(e.target.value)}/></label><label><span>Трек-номер</span><input value={tracking} onChange={e=>setTracking(e.target.value)}/></label><button className="admin-primary-button" disabled={!!busy} onClick={()=>run("delivery",()=>updateAdminOrderDelivery(o.order_number,{status:deliveryStatus,deliveryService:service||null,trackingNumber:tracking||null}))}><Save size={16}/>{busy==="delivery"?"Сохранение…":"Сохранить доставку"}</button></>:<p>Нет данных доставки.</p>}
        </section>

        <section className="admin-editor-card admin-order-control">
          <h2>Оплата</h2>
          {p?<><div className="admin-order-payment-method">{p.payment_methods.name} · {money(p.amount)}<small>Оплачено: {date(p.paid_at)}</small></div><label><span>Статус операции</span><select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value as AdminPaymentOperationStatus)}>{Object.entries(paymentLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span>Номер операции</span><input value={operation} onChange={e=>setOperation(e.target.value)}/></label><button className="admin-primary-button" disabled={!!busy} onClick={()=>run("payment",()=>updateAdminOrderPayment(o.order_number,{status:paymentStatus,operationNumber:operation||null,paidAt:paymentStatus==="succeeded"?(p.paid_at??new Date().toISOString()):p.paid_at}))}><Save size={16}/>{busy==="payment"?"Сохранение…":"Сохранить оплату"}</button></>:<p>Платёж для заказа не найден.</p>}
        </section>
      </aside>
    </div>
  </section>
}
