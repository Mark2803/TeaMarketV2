function token(){return process.env.TELEGRAM_BOT_TOKEN?.trim()||""}
export function isTelegramConfigured(){return Boolean(token())}
export async function getTelegramBotInfo(){
 const t=token();if(!t)return {configured:false as const,connected:false as const,username:null,name:null,error:null};
 try{const r=await fetch(`https://api.telegram.org/bot${t}/getMe`);const j=await r.json() as any;if(!r.ok||!j?.ok)return{configured:true as const,connected:false as const,username:null,name:null,error:String(j?.description||"Telegram API error")};const u=j.result;return{configured:true as const,connected:true as const,username:u?.username?`@${u.username}`:null,name:[u?.first_name,u?.last_name].filter(Boolean).join(" ")||null,error:null}}catch(e){return{configured:true as const,connected:false as const,username:null,name:null,error:e instanceof Error?e.message:String(e)}}
}
export async function sendTelegramMessage(chatId:string,text:string){const t=token();if(!t)throw new Error("TELEGRAM_BOT_TOKEN не задан");const r=await fetch(`https://api.telegram.org/bot${t}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chatId,text})});const j=await r.json() as any;if(!r.ok||!j?.ok)throw new Error(String(j?.description||"Telegram API error"));return j.result}
