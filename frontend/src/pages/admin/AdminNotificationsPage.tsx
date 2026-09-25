import {useEffect,useState} from "react";
import {Mail,MessageCircle,Save,Send,Settings2,Trash2,Users,X} from "lucide-react";
import {checkAdminNotificationChannel,createAdminNotificationCampaign,deleteAdminNotificationCampaign,getAdminNotifications,sendAdminNotificationCampaign,updateAdminNotificationChannel,type AdminNotificationOverview} from "../../shared/api/admin";
import "./admin-notifications.css";

const statusLabel=(s:string)=>({draft:"Черновик",sending:"Отправляется",sent:"Отправлена",completed_with_errors:"С ошибками",failed:"Ошибка"}[s]||s);
export default function AdminNotificationsPage(){
 const[data,setData]=useState<AdminNotificationOverview|null>(null),[error,setError]=useState(""),[ok,setOk]=useState(""),[settings,setSettings]=useState(false);
 const load=async()=>{try{setData((await getAdminNotifications()).data);setError("")}catch(e){setError(e instanceof Error?e.message:"Не удалось загрузить уведомления.")}};
 useEffect(()=>{void load()},[]);
 const run=async(fn:()=>Promise<unknown>,msg:string)=>{try{await fn();setOk(msg);setError("");await load()}catch(e){setError(e instanceof Error?e.message:"Не удалось выполнить действие.");setOk("")}};
 if(!data)return <div className="admin-page"><h1>Уведомления</h1><p>{error||"Загрузка…"}</p></div>;
 return <div className="admin-page notifications-page">
  <div className="admin-page-heading notification-heading"><div><span>Коммуникации</span><h1>Уведомления</h1><p>Создание рассылок покупателям.</p></div><button className="admin-secondary-button" onClick={()=>setSettings(true)}><Settings2 size={17}/>Настройка каналов</button></div>
  {error&&<div className="admin-error-box">{error}</div>}{ok&&<div className="admin-success-box">{ok}</div>}
  <Campaigns data={data} run={run}/>
  {settings&&<ChannelModal data={data} run={run} close={()=>setSettings(false)}/>} 
 </div>
}
function Campaigns({data,run}:{data:AdminNotificationOverview;run:(fn:()=>Promise<unknown>,msg:string)=>Promise<void>}){
 const email=data.channels.find(x=>x.channel==="email"),tg=data.channels.find(x=>x.channel==="telegram");
 const[x,setX]=useState({name:"",audienceType:"registered" as "all"|"registered"|"customers",subject:"",body:"",email:true,telegram:false});
 const channels:("email"|"telegram")[]=[...(x.email?["email" as const]:[]),...(x.telegram?["telegram" as const]:[])];
 const save=()=>run(()=>createAdminNotificationCampaign({name:x.name,audienceType:x.audienceType,customerIds:[],subject:x.subject,body:x.body,channels}),"Черновик сохранён.");
 return <div className="campaign-layout"><section className="notification-panel campaign-form"><h2>Новая рассылка</h2><div className="audience-note"><Users size={18}/><span>Получатели: покупатели, согласившиеся на рекламные сообщения — <strong>{data.stats.marketingEnabled}</strong></span></div>
  <label><span>Название *</span><input value={x.name} onChange={e=>setX({...x,name:e.target.value})} placeholder="Например: Новое поступление"/></label>
  <div className="field-block"><span className="field-title">Каналы *</span><div className="channel-picks"><label className={email?.is_enabled?"":"disabled"}><input type="checkbox" checked={x.email} disabled={!email?.is_enabled} onChange={e=>setX({...x,email:e.target.checked})}/><Mail size={18}/><span>Email</span><small>{email?.is_enabled?"Доступно":"Не настроено"}</small></label><label className={data.telegram.connected&&tg?.is_enabled?"":"disabled"}><input type="checkbox" checked={x.telegram} disabled={!data.telegram.connected||!tg?.is_enabled} onChange={e=>setX({...x,telegram:e.target.checked})}/><MessageCircle size={18}/><span>Telegram</span><small>{data.telegram.connected&&tg?.is_enabled?"Доступно":"Не подключён"}</small></label></div></div>
  {x.email&&<label><span>Тема Email *</span><input value={x.subject} onChange={e=>setX({...x,subject:e.target.value})}/></label>}
  <label><span>Сообщение *</span><textarea rows={8} value={x.body} onChange={e=>setX({...x,body:e.target.value})}/></label>
  <button className="admin-primary-button" disabled={!x.name.trim()||!x.body.trim()||channels.length===0||(x.email&&!x.subject.trim())} onClick={()=>void save()}><Save size={16}/>Сохранить черновик</button>
 </section><section className="notification-panel"><h2>Последние рассылки</h2>{data.campaigns.length===0?<div className="empty-state"><Send/><strong>Рассылок пока нет</strong></div>:<div className="campaign-list">{data.campaigns.map(c=><article key={c.id}><div className="campaign-main"><strong>{c.name}</strong><div className="campaign-meta">{(c.channels||["email"]).map(ch=><span key={ch}>{ch==="email"?<Mail size={14}/>:<MessageCircle size={14}/>} {ch==="email"?"Email":"Telegram"}</span>)}<small>{new Date(c.created_at).toLocaleDateString("ru-RU")}</small></div></div><span className={`campaign-status ${c.status}`}>{statusLabel(c.status)}</span><div className="admin-inline-actions">{c.status==="draft"&&<button className="admin-primary-button" onClick={()=>void run(()=>sendAdminNotificationCampaign(c.id),"Рассылка обработана.")}><Send size={16}/>Отправить</button>}<button className="icon-button" title="Удалить" onClick={()=>void run(()=>deleteAdminNotificationCampaign(c.id),"Рассылка удалена.")}><Trash2 size={17}/></button></div></article>)}</div>}</section></div>
}
function ChannelModal({data,run,close}:{data:AdminNotificationOverview;run:(fn:()=>Promise<unknown>,msg:string)=>Promise<void>;close:()=>void}){
 const email=data.channels.find(x=>x.channel==="email"),tg=data.channels.find(x=>x.channel==="telegram");const[name,setName]=useState(email?.sender_name??"Чайный Мастер"),[from,setFrom]=useState(email?.sender_from??"info@tea-master-team.ru");
 return <div className="notification-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><div className="notification-modal"><div className="modal-head"><div><h2>Каналы рассылок</h2><p>Технические настройки способов отправки.</p></div><button className="icon-button" onClick={close}><X/></button></div>
  <div className="compact-channel"><div className="compact-channel-title"><Mail/><div><strong>Email</strong><small>{email?.is_enabled?"Подключён":"Выключен"}</small></div></div><label><span>Имя отправителя</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label><span>Email отправителя</span><input value={from} onChange={e=>setFrom(e.target.value)}/></label><div className="channel-actions"><button className="admin-secondary-button" onClick={()=>void run(()=>checkAdminNotificationChannel("email"),"Email настроен.")}>Проверить</button><button className="admin-primary-button" onClick={()=>void run(()=>updateAdminNotificationChannel("email",{isEnabled:true,senderName:name,senderFrom:from}),"Email сохранён.")}>Сохранить</button></div></div>
  <div className="compact-channel"><div className="compact-channel-title"><MessageCircle/><div><strong>Telegram</strong><small>{data.telegram.connected?(data.telegram.username||"Бот подключён"):"Не подключён"}</small></div></div>{data.telegram.connected?<div className="channel-actions"><button className="admin-secondary-button" onClick={()=>void run(()=>checkAdminNotificationChannel("telegram"),"Telegram-бот отвечает.")}>Проверить</button>{!tg?.is_enabled&&<button className="admin-primary-button" onClick={()=>void run(()=>updateAdminNotificationChannel("telegram",{isEnabled:true}),"Telegram включён.")}>Включить</button>}</div>:<p className="channel-hint">Для подключения задайте TELEGRAM_BOT_TOKEN на backend. После проверки Telegram станет доступен при создании рассылки.</p>}</div>
 </div></div>
}
