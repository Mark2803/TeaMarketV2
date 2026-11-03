import { useState } from "react";

type Point = { date: string; revenue: number; orders: number; visitors: number };
type Metric = "revenue" | "orders" | "visitors";
const num = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
const dateLabel = (d: string) => { const [y, m, day] = d.split("-"); return `${day}.${m}.${y}`; };
export default function FinanceChart({ data, metric = "revenue" }: { data: Point[]; metric?: Metric }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d[metric]));
  const ticks = [1, .75, .5, .25, 0];
  const formatter = (v: number) => metric === "revenue" ? `${num(v)} ₽` : num(v);
  return <div className="finance-chart" aria-label="Динамика показателей по дням">
    <div className="finance-chart-axis">{ticks.map(t => <span key={t}>{formatter(Math.round(max * t))}</span>)}</div>
    <div className="finance-chart-plot">
      <div className="finance-chart-grid">{ticks.map(t => <span key={t}/>)}</div>
      <div className="finance-chart-bars">
        {data.map((d, i) => <div key={d.date} className={`finance-chart-item${active === i ? " is-active" : ""}`} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} tabIndex={0} aria-label={`${dateLabel(d.date)}: ${formatter(d[metric])}`}>
          <div className="finance-chart-bar-area"><div className="finance-chart-bar" style={{ height: `${d[metric] ? Math.max(2, d[metric] / max * 100) : 0}%` }}/>{active === i && <div className="finance-chart-tooltip"><strong>{formatter(d[metric])}</strong><small>{dateLabel(d.date)}</small></div>}</div>
          <span className="finance-chart-date">{d.date.slice(5).replace("-", ".")}</span>
        </div>)}
      </div>
    </div>
    {!data.length && <p>Нет данных за выбранный период.</p>}
  </div>;
}
