import { useState, type FormEvent } from "react";
import { PackageSearch, Search } from "lucide-react";
import { findTracking, type TrackingResult } from "../shared/api/tracking";
import "../shared/styles/tracking-search.css";

const labels: Record<string,string> = {
  HANDED_OVER:"Передано в ПВЗ Яндекса",IN_TRANSIT:"В пути",AT_PICKUP_POINT:"Прибыло в ПВЗ назначения",DELIVERED:"Получено покупателем",
  CREATED:"Отправление оформлено", ACCEPTED:"Принято Яндексом", SORTING:"Сортировка", SORTING_CENTER_LOADED:"Отправление загружено в сортировочном центре",
  DELIVERY_IN_PROGRESS:"В пути", DELIVERY_DELIVERED:"Доставлено", CANCELLED:"Отменено",
  pending:"Ожидает оформления",preparing:"Подготавливается",handed_over:"Передано службе доставки",
  in_transit:"В пути",delivered:"Доставлено",returned:"Возвращено",cancelled:"Отменено"
};
export default function TrackingSearch() {
  const [number,setNumber]=useState("");
  const [result,setResult]=useState<TrackingResult|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent) {
    e.preventDefault();setError("");setResult(null);setLoading(true);
    try { setResult(await findTracking(number.trim())); }
    catch(e) { setError(e instanceof Error?e.message:"Не удалось найти отправление"); }
    finally { setLoading(false); }
  }
  return <section className="tracking-search" aria-label="Отслеживание посылки">
    <h2><PackageSearch size={21} aria-hidden="true"/> Отследить заказ</h2>
    <form onSubmit={e=>void submit(e)} className="tracking-search__form">
      <input aria-label="Трек-номер" value={number} onChange={e=>setNumber(e.target.value)} placeholder="Введите номер заказа или трек-номер" maxLength={80} required/>
      <button type="submit" disabled={loading||!number.trim()}><Search size={17} aria-hidden="true"/> {loading?"Поиск…":"Найти"}</button>
    </form>
    {error&&<p className="tracking-search__error" role="alert">{error}</p>}
    {result&&<div className="tracking-search__result" aria-live="polite">
      <div><small>{result.trackingNumber ? `Отправление ${result.trackingNumber}` : `Заказ ${result.orderNumber ?? number.trim()}`}</small><strong>{labels[result.status]??"Статус уточняется"}</strong></div>
      {result.updatedAt&&<p>Обновлено: {new Date(result.updatedAt).toLocaleString("ru-RU")}</p>}
      {result.simulated&&<p role="status" style={{fontWeight:700,color:"#94612a"}}>ТЕСТОВАЯ СИМУЛЯЦИЯ · события не получены от Яндекса</p>}
      <h3>История перемещения</h3>
      {result.events.length? <ol>{[...result.events].reverse().map((event,i)=><li key={i}><strong>{labels[event.status]??event.status.replaceAll("_", " ")}</strong><span>{new Date(event.timestamp).toLocaleString("ru-RU")}{event.location?` · ${event.location}`:""}</span></li>)}</ol> : <p>Подробные события маршрута пока не получены от службы доставки. Текущий статус показан выше.</p>}
    </div>}
  </section>;
}
