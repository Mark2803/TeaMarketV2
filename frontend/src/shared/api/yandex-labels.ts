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
  const response = await fetch(url,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumbers:orders,size,layout:orders.length>1?"many":"one"})});
  if (!response.ok) { const data=await response.json().catch(()=>null);throw new Error(data?.error?.message??`Ошибка PDF: ${response.status}`); }
  const blob=await response.blob();
  if (blob.type && !blob.type.includes("pdf")) throw new Error("Сервер не вернул PDF");
  const objectUrl=URL.createObjectURL(blob);
  const anchor=document.createElement("a");anchor.href=objectUrl;anchor.download=`yandex-labels-${orders.length}.pdf`;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
}
