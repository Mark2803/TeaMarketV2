export type DashboardWidgetId =
  | "sales_today" | "new_orders" | "average_order" | "low_stock"
  | "sales_week" | "recent_orders" | "out_of_stock" | "products";

export type DashboardWidgetConfig = { id: DashboardWidgetId; enabled: boolean };
export const DASHBOARD_WIDGETS: Array<{id:DashboardWidgetId; title:string; description:string; defaultEnabled:boolean}> = [
  {id:"sales_today",title:"Продажи сегодня",description:"Сумма заказов за текущий день.",defaultEnabled:true},
  {id:"new_orders",title:"Новые заказы",description:"Заказы со статусом «Новый».",defaultEnabled:true},
  {id:"average_order",title:"Средний чек",description:"Средняя сумма заказа за сегодня.",defaultEnabled:true},
  {id:"low_stock",title:"Низкие остатки",description:"SKU с остатком от 1 до 5 единиц.",defaultEnabled:true},
  {id:"sales_week",title:"Продажи за 7 дней",description:"Краткая динамика продаж по дням.",defaultEnabled:true},
  {id:"recent_orders",title:"Последние заказы",description:"Пять последних заказов и их статусы.",defaultEnabled:true},
  {id:"out_of_stock",title:"Нет в наличии",description:"SKU с нулевым остатком.",defaultEnabled:false},
  {id:"products",title:"Товары",description:"Общее количество товаров в каталоге.",defaultEnabled:false},
];
const KEY="tea-admin-dashboard-widgets-v1";
export function defaultDashboardWidgets():DashboardWidgetConfig[]{return DASHBOARD_WIDGETS.map(x=>({id:x.id,enabled:x.defaultEnabled}));}
export function loadDashboardWidgets():DashboardWidgetConfig[]{
  try { const raw=localStorage.getItem(KEY); if(!raw)return defaultDashboardWidgets(); const saved=JSON.parse(raw) as DashboardWidgetConfig[]; const valid=new Map(saved.map(x=>[x.id,x])); return [...saved.filter(x=>DASHBOARD_WIDGETS.some(d=>d.id===x.id)),...DASHBOARD_WIDGETS.filter(d=>!valid.has(d.id)).map(d=>({id:d.id,enabled:d.defaultEnabled}))]; } catch { return defaultDashboardWidgets(); }
}
export function saveDashboardWidgets(value:DashboardWidgetConfig[]){localStorage.setItem(KEY,JSON.stringify(value)); window.dispatchEvent(new Event("dashboard-widgets-changed"));}
