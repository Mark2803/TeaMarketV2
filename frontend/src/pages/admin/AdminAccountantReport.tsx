import { useEffect, useState } from "react";
import { apiRequest } from "../../shared/api/client";

type Report={range:{from:string;to:string};rows:Array<{date:string;number:string;paymentId:string;customer:string;amount:number;status:string}>;summary:{count:number;paid:number};warnings:string[]};
const iso=(d:Date)=>d.toISOString().slice(0,10);
const money=(n:number)=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB"}).format(n);
const apiBase=import.meta.env.VITE_API_BASE_URL as string;
function url(path:string,from:string,to:string){const u=new URL(apiBase.replace(/\/$/,"")+path,window.location.origin);u.searchParams.set("from",from);u.searchParams.set("to",to);return u.toString()}
export default function AdminAccountantReport(){
 const [from,setFrom]=useState(()=>{const d=new Date();d.setDate(d.getDate()-29);return iso(d)});
 const [to,setTo]=useState(()=>iso(new Date()));
 const [email,setEmail]=useState(()=>localStorage.getItem("accountant-report-email")??"");
 const [report,setReport]=useState<Report|null>(null);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function preview(){setBusy(true);setMessage("");try{const r=await apiRequest<{data:Report}>("/moderator/accountant-report",{query:{from,to}});setReport(r.data)}catch(e){setMessage(e instanceof Error?e.message:"Ошибка отчёта")}finally{setBusy(false)}}
 useEffect(()=>{void preview()},[]);
 async function download(){setBusy(true);setMessage("");try{const r=await fetch(url("/moderator/accountant-report/download",from,to),{credentials:"include"});if(!r.ok)throw new Error("Не удалось скачать отчёт");const blob=await r.blob();const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="accountant-"+from+"-"+to+".xlsx";link.click();URL.revokeObjectURL(link.href)}catch(e){setMessage(e instanceof Error?e.message:"Ошибка выгрузки")}finally{setBusy(false)}}
 async function send(){setBusy(true);setMessage("");try{const r=await apiRequest<{data:{sent:boolean}}>("/moderator/accountant-report/send",{method:"POST",body:JSON.stringify({from,to,email})});if(r.data.sent){localStorage.setItem("accountant-report-email",email);setMessage("Отчёт отправлен на "+email)}}catch(e){setMessage(e instanceof Error?e.message:"Ошибка отправки")}finally{setBusy(false)}}
 return <section className="admin-analytics-card"><h2>Отчёт для бухгалтера</h2>
  <p>Оплаченные операции по дате платежа (UTC). Excel и отправка бухгалтеру.</p>
  <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"end"}}>
   <label>С <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>По <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
   <button disabled={busy} onClick={()=>void preview()}>Сформировать</button>
   <button disabled={busy} onClick={()=>void download()}>Скачать Excel</button>
  </div>
  <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:16,alignItems:"end"}}>
   <label>Email бухгалтера <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="accountant@example.ru"/></label>
   <button disabled={busy||!email} onClick={()=>void send()}>Отправить на почту</button>
  </div>
  {message&&<p role="status">{message}</p>}
  {report&&<><p><strong>Оплат: {report.summary.count}; сумма: {money(report.summary.paid)}</strong></p>
  <div className="admin-analytics-table-wrap"><table className="admin-analytics-table"><thead><tr><th>Дата UTC</th><th>Заказ</th><th>ID платежа</th><th>Покупатель</th><th>Сумма</th></tr></thead><tbody>
   {report.rows.length?report.rows.map((r,i)=><tr key={r.paymentId||i}><td>{r.date}</td><td>{r.number}</td><td>{r.paymentId||"Нет данных"}</td><td>{r.customer}</td><td>{money(r.amount)}</td></tr>):<tr><td colSpan={5}>Нет оплат за выбранный период</td></tr>}
  </tbody></table></div>
  {report.warnings.map(w=><p key={w} className="admin-analytics-note">{w}</p>)}</>}
 </section>
}
