import {prisma} from "../../database/prisma.js";
import {sendEmail} from "./email-transport.js";
import {sendTelegramMessage} from "./telegram-transport.js";

export type AdminAlertSettings = {
 email_enabled:boolean;email_recipient:string;
 telegram_enabled:boolean;telegram_chat_id:string;
 max_enabled:boolean;max_chat_id:string;
};
export async function readAdminAlertSettings():Promise<AdminAlertSettings>{
 const rows=await prisma.$queryRaw<AdminAlertSettings[]>`
 SELECT email_enabled,email_recipient,telegram_enabled,telegram_chat_id,max_enabled,max_chat_id
 FROM admin_order_alert_settings WHERE id=1`;
 if(!rows[0]) throw new Error("Не применена миграция 320_admin_order_alerts");
 return rows[0];
}
export async function saveAdminAlertSettings(x:AdminAlertSettings){
 await prisma.$executeRaw`
 UPDATE admin_order_alert_settings SET
 email_enabled=${x.email_enabled},email_recipient=${x.email_recipient},
 telegram_enabled=${x.telegram_enabled},telegram_chat_id=${x.telegram_chat_id},
 max_enabled=${x.max_enabled},max_chat_id=${x.max_chat_id},
 updated_at=now() WHERE id=1`;
 return readAdminAlertSettings();
}
async function claim(orderId:string,channel:string):Promise<boolean>{
 const rows=await prisma.$queryRaw<{channel:string}[]>`
 INSERT INTO admin_order_alert_deliveries(order_id,channel,status)
 VALUES (${orderId}::uuid,${channel},'sending')
 ON CONFLICT (order_id,channel) DO UPDATE
 SET status='sending',error_message=NULL,updated_at=now()
 WHERE admin_order_alert_deliveries.status='failed'
    OR (admin_order_alert_deliveries.status='sending'
        AND admin_order_alert_deliveries.updated_at < now() - interval '2 minutes')
 RETURNING channel`;
 return rows.length===1;
}
async function record(orderId:string,channel:string,status:"sent"|"failed",error:string|null){
 await prisma.$executeRaw`
 UPDATE admin_order_alert_deliveries SET status=${status},error_message=${error},updated_at=now()
 WHERE order_id=${orderId}::uuid AND channel=${channel}`;
}
export async function notifyAdminAboutOrder(order:{id:string;order_number:string;total_amount:unknown}){
 const settings=await readAdminAlertSettings();
 const message=`Новый заказ ${order.order_number}\nСумма: ${Number(order.total_amount).toFixed(2)} ₽\nАдминка: /admin/orders/${encodeURIComponent(order.order_number)}`;
 const tasks:Array<[string,boolean,()=>Promise<unknown>]>=[
 // Telegram is processed first: an unavailable SMTP server must not delay the alert.
 ["telegram",settings.telegram_enabled&&Boolean(settings.telegram_chat_id),()=>sendTelegramMessage(settings.telegram_chat_id,message)],
 ["email",settings.email_enabled&&Boolean(settings.email_recipient),()=>sendEmail(settings.email_recipient,`Новый заказ ${order.order_number}`,message)]
 ];
 // MAX не отправляем, пока не подтверждены API и права бота.
 for(const [channel,enabled,send] of tasks){
  if(!enabled)continue;
  try{
   if(!await claim(order.id,channel))continue;
   try{await send();await record(order.id,channel,"sent",null)}
   catch(e){const msg=e instanceof Error?e.message:String(e);await record(order.id,channel,"failed",msg);console.error("[ADMIN_ALERT]",channel,msg)}
  }catch(e){console.error("[ADMIN_ALERT] logging error",e)}
 }
}
