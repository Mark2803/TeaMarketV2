import type {Request,Response} from "express";
import {prisma} from "../../../database/prisma.js";
import {sendEmail} from "../../notifications/email-transport.js";
import {ensureNotificationDefaults} from "../../notifications/notification-defaults.js";
import {getTelegramBotInfo,sendTelegramMessage} from "../../notifications/telegram-transport.js";
import {campaignInputSchema,channelSettingsSchema,templateUpdateSchema} from "./moderator-notifications.schemas.js";
const db=prisma as any;
const id=(req:Request)=>String(req.params.id);
export async function getNotificationOverview(_req:Request,res:Response){
 await ensureNotificationDefaults();
 const cutoff=new Date(Date.now()-30*24*60*60*1000);
 await db.notification_deliveries.deleteMany({where:{created_at:{lt:cutoff}}});
 const[channels,templates,campaigns,customers,marketingEnabled,telegramLinked]=await Promise.all([
  db.notification_channel_settings.findMany({orderBy:{channel:"asc"}}),db.notification_templates.findMany({orderBy:{created_at:"asc"}}),db.notification_campaigns.findMany({orderBy:{created_at:"desc"},take:50}),prisma.customers.count({where:{email:{not:null}}}),db.notification_preferences.count({where:{email_marketing:true}}),db.customers.count({where:{telegram_chat_id:{not:null}}})
 ]);
 const telegram=await getTelegramBotInfo();
 const stats={activeAutomations:templates.filter((x:any)=>x.is_active).length,campaigns:campaigns.length,emailCustomers:customers,marketingEnabled,telegramLinked};
 res.json({data:{channels,templates,campaigns,stats,telegram}})
}
export async function updateNotificationTemplate(req:Request,res:Response){const r=templateUpdateSchema.safeParse(req.body);if(!r.success){res.status(400).json({error:{message:"Некорректный шаблон",details:r.error.flatten()}});return}const x=r.data;const data=await db.notification_templates.update({where:{id:id(req)},data:{...(x.name!==undefined?{name:x.name}:{}),...(x.subject!==undefined?{subject:x.subject}:{}),...(x.body!==undefined?{body:x.body}:{}),...(x.isActive!==undefined?{is_active:x.isActive}:{}),updated_at:new Date()}});res.json({data})}
export async function createNotificationCampaign(req:Request,res:Response){const r=campaignInputSchema.safeParse(req.body);if(!r.success){res.status(400).json({error:{message:"Некорректная рассылка",details:r.error.flatten()}});return}const x=r.data;const data=await db.notification_campaigns.create({data:{name:x.name,audience_type:x.audienceType,customer_ids:x.customerIds,subject:x.subject,body:x.body,channels:x.channels,status:"draft"}});res.status(201).json({data})}
export async function deleteNotificationCampaign(req:Request,res:Response){const row=await db.notification_campaigns.findUnique({where:{id:id(req)},select:{status:true}});if(!row){res.status(404).json({error:{message:"Рассылка не найдена"}});return}if(row.status==="sending"){res.status(409).json({error:{message:"Нельзя удалить выполняющуюся рассылку"}});return}await db.notification_campaigns.delete({where:{id:id(req)}});res.status(204).end()}
export async function sendNotificationCampaign(req:Request,res:Response){
 const campaign=await db.notification_campaigns.findUnique({where:{id:id(req)}});if(!campaign){res.status(404).json({error:{message:"Рассылка не найдена"}});return}if(campaign.status==="sent"||campaign.status==="sending"){res.status(409).json({error:{message:"Рассылка уже отправлена или отправляется"}});return}
 const channels=Array.isArray(campaign.channels)?campaign.channels.filter((x:unknown):x is string=>x==="email"||x==="telegram"):["email"];
 if(channels.includes("email")){const c=await db.notification_channel_settings.findUnique({where:{channel:"email"}});if(!c?.is_enabled){res.status(409).json({error:{message:"Email-канал выключен"}});return}}
 if(channels.includes("telegram")){const c=await db.notification_channel_settings.findUnique({where:{channel:"telegram"}});const info=await getTelegramBotInfo();if(!c?.is_enabled||!info.connected){res.status(409).json({error:{message:"Telegram-канал не подключён или выключен"}});return}}
 await db.notification_campaigns.update({where:{id:campaign.id},data:{status:"sending",updated_at:new Date()}});
 const ids=Array.isArray(campaign.customer_ids)?campaign.customer_ids.filter((x:unknown):x is string=>typeof x==="string"):[];const where:any={};if(campaign.audience_type==="customers")where.id={in:ids};
 const customers=await db.customers.findMany({where,select:{id:true,email:true,telegram_chat_id:true}});let sent=0,failed=0,skipped=0;
 for(const c of customers){const pref=await db.notification_preferences.findUnique({where:{customer_id:c.id}});if(pref?.email_marketing!==true){skipped++;continue}
  if(channels.includes("email")&&c.email){try{await sendEmail(c.email,campaign.subject,campaign.body);sent++}catch(e){await db.notification_deliveries.create({data:{customer_id:c.id,campaign_id:campaign.id,recipient:c.email,subject:campaign.subject,body:"",status:"failed",error_message:e instanceof Error?e.message:String(e)}});failed++}}
  if(channels.includes("telegram")&&c.telegram_chat_id){try{await sendTelegramMessage(c.telegram_chat_id,campaign.body);sent++}catch(e){await db.notification_deliveries.create({data:{customer_id:c.id,campaign_id:campaign.id,recipient:`telegram:${c.telegram_chat_id}`,subject:"Telegram",body:"",status:"failed",error_message:e instanceof Error?e.message:String(e)}});failed++}}
 }
 await db.notification_campaigns.update({where:{id:campaign.id},data:{status:failed?"completed_with_errors":"sent",sent_at:new Date(),updated_at:new Date()}});res.json({data:{sent,failed,skipped,eligible:customers.length}})
}
export async function updateNotificationChannel(req:Request,res:Response){const channel=String(req.params.channel);if(!["email","telegram"].includes(channel)){res.status(400).json({error:{message:"Неизвестный канал"}});return}const r=channelSettingsSchema.safeParse(req.body);if(!r.success){res.status(400).json({error:{message:"Некорректные настройки",details:r.error.flatten()}});return}const x=r.data;if(channel==="telegram"&&x.isEnabled){const info=await getTelegramBotInfo();if(!info.connected){res.status(409).json({error:{message:"Сначала настройте TELEGRAM_BOT_TOKEN и проверьте подключение Telegram-бота"}});return}}const data=await db.notification_channel_settings.upsert({where:{channel},create:{channel,is_enabled:x.isEnabled,sender_name:x.senderName??(channel==="email"?"Чайный Мастер":"Telegram Bot"),sender_from:channel==="email"?(x.senderFrom??null):null},update:{is_enabled:x.isEnabled,...(channel==="email"?{sender_name:x.senderName??null,sender_from:x.senderFrom??null}:{}),updated_at:new Date()}});res.json({data})}
export async function checkNotificationChannel(req:Request,res:Response){const channel=String(req.params.channel);if(channel==="telegram"){const data=await getTelegramBotInfo();res.status(data.connected?200:409).json({data});return}if(channel==="email"){const configured=Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.MAIL_FROM);res.status(configured?200:409).json({data:{configured,connected:configured}});return}res.status(400).json({error:{message:"Неизвестный канал"}})}
