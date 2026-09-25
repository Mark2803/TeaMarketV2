import {prisma} from "../../database/prisma.js";

const db=prisma as any;

export const DEFAULT_NOTIFICATION_TEMPLATES=[
 {event_key:"registration_confirmation",name:"Код входа",subject:"Код входа в Чайный Мастер",body:"Ваш код для входа: {{code}}\n\nКод действует ограниченное время.",is_active:true},
 {event_key:"order_created",name:"Заказ создан",subject:"Заказ {{order_number}} принят",body:"Спасибо за заказ!\n\nЗаказ: {{order_number}}\nСумма: {{total}} ₽\n\nМы сообщим об изменении статуса заказа.",is_active:true},
 {event_key:"order_status_changed",name:"Статус заказа изменён",subject:"Изменился статус заказа {{order_number}}",body:"Заказ {{order_number}}\nНовый статус: {{status}}",is_active:true},
 {event_key:"order_shipped",name:"Заказ отправлен",subject:"Заказ {{order_number}} отправлен",body:"Ваш заказ {{order_number}} отправлен.\nТрек-номер: {{tracking_number}}",is_active:true},
 {event_key:"order_delivered",name:"Заказ доставлен",subject:"Заказ {{order_number}} доставлен",body:"Заказ {{order_number}} доставлен. Спасибо за покупку!",is_active:true},
] as const;

export async function ensureNotificationDefaults(){
 await Promise.all([
  db.notification_channel_settings.upsert({where:{channel:"email"},create:{channel:"email",is_enabled:true,sender_name:process.env.MAIL_FROM_NAME||"Чайный Мастер",sender_from:process.env.MAIL_FROM||"info@tea-master-team.ru"},update:{}}),
  db.notification_channel_settings.upsert({where:{channel:"telegram"},create:{channel:"telegram",is_enabled:false,sender_name:"Telegram Bot",sender_from:null},update:{}}),
  ...DEFAULT_NOTIFICATION_TEMPLATES.map(t=>db.notification_templates.upsert({where:{event_key:t.event_key},create:t,update:{}})),
 ]);
}
