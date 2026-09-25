import { useEffect, useMemo, useState } from "react";
import { getAdminAnalytics, type AdminAnalyticsData } from "../../shared/api/admin";

type Preset=7|30|90;
const money=(v:number)=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(v);
const pct=(v:number)=>`${v.toFixed(1).replace(".",",")}%`;
const iso=(d:Date)=>d.toISOString().slice(0,10);
const sourceName=(s:string)=>({direct:"Прямые",yandex:"Яндекс",google:"Google",telegram:"Telegram",vk:"VK",ozon:"Ozon",unknown:"Не определён"}[s]??s);

export default function AdminAnalyticsPage(){
 const [preset,setPreset]=useState<Preset>(30); const [data,setData]=useState<AdminAnalyticsData|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null); const [metric,setMetric]=useState<"revenue"|"orders"|"visitors">("revenue");
 const range=useMemo(()=>{const to=new Date();const from=new Date();from.setDate(to.getDate()-(preset-1));return{from:iso(from),to:iso(to)}},[preset]);
 useEffect(()=>{let active=true;setLoading(true);setError(null);void getAdminAnalytics(range.from,range.to).then(r=>{if(active)setData(r.data)}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Не удалось загрузить аналитику")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[range.from,range.to]);
 if(loading&&!data)return <div className="admin-analytics-state">Загрузка аналитики…</div>;
 if(error&&!data)return <div className="admin-analytics-state is-error">{error}</div>;
 if(!data)return null;
 const max=Math.max(1,...data.dynamics.map(d=>d[metric]));
 return <div className="admin-analytics">
  <div className="admin-page-heading admin-analytics-heading"><div><h1>Аналитика</h1><p>Продажи, воронка и источники переходов по данным магазина.</p></div><div className="admin-period-switch">{([7,30,90] as Preset[]).map(p=><button key={p} className={preset===p?"active":""} onClick={()=>setPreset(p)}>{p} дней</button>)}</div></div>
  {error&&<div className="admin-analytics-warning">{error}</div>}
  <div className="admin-analytics-kpis">
   <Kpi label="Посетители" value={String(data.overview.visitors)}/><Kpi label="Заказы" value={String(data.overview.orders)}/><Kpi label="Выручка" value={money(data.overview.revenue)}/><Kpi label="Средний чек" value={money(data.overview.averageCheck)}/><Kpi label="Конверсия в заказ" value={pct(data.overview.orderConversion)}/><Kpi label="Выкуп" value={pct(data.overview.buyoutRate)}/>
  </div>
  <section className="admin-analytics-card"><div className="admin-analytics-card-head"><div><h2>Динамика</h2><p>{range.from} — {range.to}</p></div><div className="admin-metric-switch"><button className={metric==="revenue"?"active":""} onClick={()=>setMetric("revenue")}>Выручка</button><button className={metric==="orders"?"active":""} onClick={()=>setMetric("orders")}>Заказы</button><button className={metric==="visitors"?"active":""} onClick={()=>setMetric("visitors")}>Посетители</button></div></div><div className="admin-mini-chart">{data.dynamics.length?data.dynamics.map(d=><div className="admin-mini-chart-col" key={d.date} title={`${d.date}: ${metric==="revenue"?money(d.revenue):d[metric]}`}><div className="admin-mini-chart-bar" style={{height:`${Math.max(3,d[metric]/max*100)}%`}}/><span>{d.date.slice(5)}</span></div>):<p>За период данных пока нет.</p>}</div></section>
  <section className="admin-analytics-card"><h2>Воронка продаж</h2><div className="admin-funnel">{data.funnel.map((f,i)=>{const base=data.funnel[0]?.value||0;return <div className="admin-funnel-step" key={f.key}><span>{f.label}</span><strong>{f.value}</strong><small>{i===0?"100%":base?pct(f.value/base*100):"0%"}</small></div>})}</div><p className="admin-analytics-note">Заказ считается без отменённых. Выкуп — заказ со статусом «Завершён».</p></section>
  <section className="admin-analytics-card"><h2>Источники трафика</h2><div className="admin-analytics-table-wrap"><table className="admin-analytics-table"><thead><tr><th>Источник</th><th>Посетители</th><th>В корзину</th><th>Заказы</th><th>Конверсия</th><th>Выручка</th></tr></thead><tbody>{data.sources.length?data.sources.map(s=><tr key={s.source}><td><strong>{sourceName(s.source)}</strong></td><td>{s.visitors}</td><td>{s.cartSessions}</td><td>{s.orders}</td><td>{pct(s.conversion)}</td><td>{money(s.revenue)}</td></tr>):<tr><td colSpan={6}>Источники начнут собираться после установки аналитики.</td></tr>}</tbody></table></div></section>
  <section className="admin-analytics-card"><h2>Товары</h2><div className="admin-analytics-table-wrap"><table className="admin-analytics-table"><thead><tr><th>Товар</th><th>Просмотры</th><th>В корзину</th><th>Продано</th><th>Конверсия</th><th>Выручка</th></tr></thead><tbody>{data.products.length?data.products.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.views}</td><td>{p.cartSessions}</td><td>{p.sold}</td><td>{pct(p.conversion)}</td><td>{money(p.revenue)}</td></tr>):<tr><td colSpan={6}>За период нет данных по товарам.</td></tr>}</tbody></table></div></section>
  <div className="admin-analytics-bottom"><section className="admin-analytics-card"><h2>Покупатели</h2><div className="admin-analytics-smallstats"><Kpi label="Новые" value={String(data.customers.newCustomers)}/><Kpi label="Повторные" value={String(data.customers.repeatCustomers)}/><Kpi label="Доля повторных" value={pct(data.customers.repeatShare)}/></div></section><section className="admin-analytics-card"><h2>Акции и скидки</h2><div className="admin-analytics-smallstats"><Kpi label="Заказы с промокодом" value={String(data.marketing.promoOrders)}/><Kpi label="С бонусами" value={String(data.marketing.loyaltyOrders)}/><Kpi label="Сумма скидок" value={money(data.marketing.discountTotal)}/><Kpi label="Выручка со скидками" value={money(data.marketing.marketingRevenue)}/></div></section></div>
 </div>
}
function Kpi({label,value}:{label:string;value:string}){return <div className="admin-analytics-kpi"><span>{label}</span><strong>{value}</strong></div>}
