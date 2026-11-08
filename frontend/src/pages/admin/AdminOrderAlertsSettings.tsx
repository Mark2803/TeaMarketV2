import {useEffect,useState} from "react";
import {apiRequest} from "../../shared/api/client";
type Settings={email_enabled:boolean;email_recipient:string;telegram_enabled:boolean;telegram_chat_id:string;max_enabled:boolean;max_chat_id:string};
const empty:Settings={email_enabled:false,email_recipient:"",telegram_enabled:false,telegram_chat_id:"",max_enabled:false,max_chat_id:""};
export default function AdminOrderAlertsSettings(){
 const [value,setValue]=useState<Settings>(empty);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 useEffect(()=>{void apiRequest<{data:Settings}>("/moderator/notifications/admin-order-alerts").then(r=>setValue(r.data)).catch(e=>setError(e instanceof Error?e.message:String(e))).finally(()=>setLoading(false))},[]);
 const update=(x:Partial<Settings>)=>setValue(v=>({...v,...x}));
 const save=async()=>{setSaving(true);setError("");setMessage("");try{const r=await apiRequest<{data:Settings}>("/moderator/notifications/admin-order-alerts",{method:"PUT",body:JSON.stringify(value)});setValue(r.data);setMessage("Настройки сохранены")}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setSaving(false)}};
 return <section className="notification-panel admin-order-alerts">
 <h2>Уведомления администратору о новых заказах</h2>
 <p>Выберите независимые каналы. Уведомления покупателям и рекламные рассылки настраиваются отдельно.</p>
 {loading?<p>Загрузка настроек…</p>:<>
 <label className="admin-order-alert-toggle"><input type="checkbox" checked={value.email_enabled} onChange={e=>update({email_enabled:e.target.checked})}/> Email</label>
 <label>Адрес получателя<input type="email" value={value.email_recipient} onChange={e=>update({email_recipient:e.target.value})} placeholder="admin@example.ru"/></label>
 <label className="admin-order-alert-toggle"><input type="checkbox" checked={value.telegram_enabled} onChange={e=>update({telegram_enabled:e.target.checked})}/> Telegram</label>
 <label>Chat ID администратора<input value={value.telegram_chat_id} onChange={e=>update({telegram_chat_id:e.target.value})} placeholder="Например, 123456789"/></label>
 <label className="admin-order-alert-toggle"><input type="checkbox" disabled checked={false} readOnly/> MAX — подключение в разработке</label>
 <p className="admin-analytics-note">Для Telegram на backend должен быть настроен TELEGRAM_BOT_TOKEN. MAX станет доступен после подключения официального API.</p>
 {error&&<p className="admin-error-box">{error}</p>}{message&&<p className="admin-success-box">{message}</p>}
 <button className="admin-primary-button" disabled={saving} onClick={()=>void save()}>{saving?"Сохранение…":"Сохранить настройки"}</button>
 </>}
 </section>
}
