import { apiRequest } from "./client";
const base = import.meta.env.VITE_API_BASE_URL;
export type YandexShipmentRow = {order_number:string; yandex_request_id:string|null; shipment_status:string|null};
export async function loadYandexShipmentMap(): Promise<Map<string,YandexShipmentRow>> {
  const response = await apiRequest<{data:YandexShipmentRow[]}>("/moderator/yandex-shipments");
  return new Map(response.data.map(row=>[row.order_number,row]));
}
export async function downloadYandexLabels(orders:string[],size="58x40"):Promise<void>{
  if (!orders.length) throw new Error("Не выбраны отправления");
  const url = new URL(`${String(base).replace(/\/$/,"")}/moderator/yandex-shipments/labels/batch`,window.location.origin);
  const csrfUrl = new URL(`${String(base).replace(/\/$/,"")}/moderator/csrf`,window.location.origin);
  const csrfResponse = await fetch(csrfUrl,{credentials:"include",cache:"no-store"});
  if(!csrfResponse.ok)throw new Error("Не удалось подтвердить административную сессию");
  const csrfData = await csrfResponse.json() as {token?:string};
  if(!csrfData.token)throw new Error("Не получен CSRF-токен");
  const response = await fetch(url,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrfData.token},body:JSON.stringify({orderNumbers:orders,size,layout:orders.length>1?"many":"one"})});
  if (!response.ok) { const data=await response.json().catch(()=>null);throw new Error(data?.error?.message??`Ошибка PDF: ${response.status}`); }
  const blob=await response.blob();
  if (blob.type && !blob.type.includes("pdf")) throw new Error("Сервер не вернул PDF");
  const objectUrl=URL.createObjectURL(blob);
  const anchor=document.createElement("a");anchor.href=objectUrl;anchor.download=`yandex-labels-${orders.length}.pdf`;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
}

/** Submit an existing paid order to Yandex. Backend prevents duplicate shipments. */
export async function createYandexShipment(orderNumber:string):Promise<void>{
  const root=String(base).replace(/\/$/,"");
  const csrfResponse=await fetch(new URL(`${root}/moderator/csrf`,window.location.origin),{credentials:"include",cache:"no-store"});
  if(!csrfResponse.ok)throw new Error("Не удалось подтвердить административную сессию");
  const csrfData=await csrfResponse.json() as {token?:string};
  if(!csrfData.token)throw new Error("Не получен CSRF-токен");
  const response=await fetch(new URL(`${root}/moderator/yandex-shipments/${encodeURIComponent(orderNumber)}/create`,window.location.origin),{
    method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrfData.token}
  });
  if(!response.ok){
    const payload=await response.json().catch(()=>null) as {error?:{code?:string;message?:string;diagnostics?:{upstreamCode?:string;fields?:string[]}}}|null;
    const error=payload?.error;
    const details=[error?.diagnostics?.upstreamCode,...(error?.diagnostics?.fields??[])].filter(Boolean).join(", ");
    throw new Error([error?.message??`Не удалось оформить отправление (HTTP ${response.status})`,details].filter(Boolean).join(": "));
  }
}
