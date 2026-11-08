import {Router} from "express";
import {z} from "zod";
import {readAdminAlertSettings,saveAdminAlertSettings} from "../../notifications/admin-order-alerts.service.js";
const router=Router();
const schema=z.object({
 email_enabled:z.boolean(),email_recipient:z.string().trim().max(320),
 telegram_enabled:z.boolean(),telegram_chat_id:z.string().trim().max(128),
 max_enabled:z.boolean(),max_chat_id:z.string().trim().max(128)
}).refine(x=>!x.email_enabled||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email_recipient),{message:"Укажите корректный Email"})
.refine(x=>!x.telegram_enabled||Boolean(x.telegram_chat_id),{message:"Укажите Telegram Chat ID"})
.refine(x=>!x.max_enabled,{message:"MAX пока не подключён: необходима проверенная интеграция с API"});
router.get("/",async(_req,res)=>{try{res.json({data:await readAdminAlertSettings()})}catch(e){res.status(500).json({error:{message:e instanceof Error?e.message:"Ошибка настроек"}})}});
router.put("/",async(req,res)=>{const result=schema.safeParse(req.body);if(!result.success){res.status(400).json({error:{message:result.error.issues[0]?.message??"Некорректные настройки"}});return}
 try{res.json({data:await saveAdminAlertSettings(result.data)})}catch(e){res.status(500).json({error:{message:e instanceof Error?e.message:"Ошибка сохранения"}})}});
export default router;
