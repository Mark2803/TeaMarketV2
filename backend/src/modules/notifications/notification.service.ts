import {prisma} from "../../database/prisma.js";
import {sendEmail} from "./email-transport.js";
import {ensureNotificationDefaults} from "./notification-defaults.js";
const db=prisma as any;
const render=(s:string,v:Record<string,string|number|null|undefined>)=>s.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_,k)=>String(v[k]??""));
export async function sendTemplateEmail(eventKey:string,to:string,vars:Record<string,string|number|null|undefined>,customerId?:string|null){
 await ensureNotificationDefaults();
 const [channel,t]=await Promise.all([db.notification_channel_settings.findUnique({where:{channel:"email"}}),db.notification_templates.findUnique({where:{event_key:eventKey}})]);
 if(!channel?.is_enabled||!t?.is_active)return {sent:false,reason:"disabled" as const};
 const subject=render(t.subject,vars),body=render(t.body,vars);const d=await db.notification_deliveries.create({data:{customer_id:customerId??null,event_key:eventKey,recipient:to,subject,body,status:"pending"}});
 try{await sendEmail(to,subject,body);await db.notification_deliveries.update({where:{id:d.id},data:{status:"sent",sent_at:new Date()}});return{sent:true}}catch(e){await db.notification_deliveries.update({where:{id:d.id},data:{status:"failed",error_message:e instanceof Error?e.message:String(e)}});return{sent:false,reason:"failed" as const}}
}
export async function sendOrderStatusEmail(orderNumber:string,status:string){
 const o=await prisma.orders.findUnique({where:{order_number:orderNumber},select:{email:true,customer_id:true,order_number:true,order_deliveries:{select:{tracking_number:true}}}});if(!o?.email)return;
 const key=status==="shipped"?"order_shipped":status==="delivered"||status==="completed"?"order_delivered":"order_status_changed";
 await sendTemplateEmail(key,o.email,{order_number:o.order_number,status,tracking_number:o.order_deliveries?.tracking_number??""},o.customer_id);
}
