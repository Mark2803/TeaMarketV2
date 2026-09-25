import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { useState } from "react";
import { DASHBOARD_WIDGETS, defaultDashboardWidgets, loadDashboardWidgets, saveDashboardWidgets } from "../../features/admin/dashboard/dashboardWidgets";

export default function AdminSettingsPage(){
 const [items,setItems]=useState(loadDashboardWidgets); const [saved,setSaved]=useState(false);
 const move=(i:number,d:-1|1)=>{const n=i+d;if(n<0||n>=items.length)return;const next=[...items];[next[i],next[n]]=[next[n],next[i]];setItems(next);setSaved(false)};
 const toggle=(id:string)=>{setItems(v=>v.map(x=>x.id===id?{...x,enabled:!x.enabled}:x));setSaved(false)};
 const reset=()=>{setItems(defaultDashboardWidgets());setSaved(false)};
 return <section className="admin-settings-page">
  <div className="admin-page-heading"><div><h1>Настройки</h1><p>Настройка интерфейса панели управления.</p></div></div>
  <div className="admin-section-card admin-dashboard-settings">
   <div className="admin-settings-card-heading"><div><h2>Главная панель</h2><p>Выберите виджеты и задайте порядок их отображения на Главной.</p></div><button className="admin-secondary-button" onClick={reset}><RotateCcw size={16}/> По умолчанию</button></div>
   <div className="admin-widget-settings-list">{items.map((item,i)=>{const meta=DASHBOARD_WIDGETS.find(x=>x.id===item.id)!;return <div className="admin-widget-setting" key={item.id}>
    <label><input type="checkbox" checked={item.enabled} onChange={()=>toggle(item.id)}/><span><strong>{meta.title}</strong><small>{meta.description}</small></span></label>
    <div className="admin-widget-order"><button aria-label="Выше" disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={17}/></button><button aria-label="Ниже" disabled={i===items.length-1} onClick={()=>move(i,1)}><ArrowDown size={17}/></button></div>
   </div>})}</div>
   <div className="admin-settings-actions"><button className="admin-primary-button" onClick={()=>{saveDashboardWidgets(items);setSaved(true)}}>Сохранить</button>{saved&&<span>Настройки сохранены.</span>}</div>
  </div>
 </section>
}
