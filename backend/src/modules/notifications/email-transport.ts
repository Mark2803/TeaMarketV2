import net from "node:net";
import tls from "node:tls";

function required(name:string){const v=process.env[name]?.trim();if(!v)throw new Error(`Не задана переменная окружения ${name}`);return v}
function reply(socket:net.Socket|tls.TLSSocket){return new Promise<string>((resolve,reject)=>{let b="";const data=(c:Buffer)=>{b+=c.toString("utf8");const l=b.split(/\r?\n/).filter(Boolean).at(-1);if(l&&/^\d{3} /.test(l)){clean();resolve(b)}};const err=(e:Error)=>{clean();reject(e)};const clean=()=>{socket.off("data",data);socket.off("error",err)};socket.on("data",data);socket.on("error",err)})}
async function cmd(socket:net.Socket|tls.TLSSocket,value:string,expected:number[]){socket.write(`${value}\r\n`);const r=await reply(socket);if(!expected.includes(Number(r.slice(0,3))))throw new Error(`SMTP ${value.split(" ")[0]}: ${r.trim()}`)}
function escapeHtml(v:string){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!))}
export async function sendEmail(to:string,subject:string,body:string){
 const host=required("SMTP_HOST"),port=Number(process.env.SMTP_PORT||"2525"),user=required("SMTP_USER"),password=required("SMTP_PASSWORD"),from=required("MAIL_FROM"),fromName=process.env.MAIL_FROM_NAME?.trim()||"Чайный Мастер";
 const plain=await new Promise<net.Socket>((resolve,reject)=>{const s=net.createConnection({host,port},()=>resolve(s));s.setTimeout(15000,()=>s.destroy(new Error("SMTP timeout")));s.once("error",reject)});await reply(plain);await cmd(plain,"EHLO tea-master-team.ru",[250]);await cmd(plain,"STARTTLS",[220]);
 const secure=tls.connect({socket:plain,servername:host,minVersion:"TLSv1.2"});await new Promise<void>((resolve,reject)=>{secure.once("secureConnect",resolve);secure.once("error",reject)});await cmd(secure,"EHLO tea-master-team.ru",[250]);await cmd(secure,"AUTH LOGIN",[334]);await cmd(secure,Buffer.from(user).toString("base64"),[334]);await cmd(secure,Buffer.from(password).toString("base64"),[235]);await cmd(secure,`MAIL FROM:<${from}>`,[250]);await cmd(secure,`RCPT TO:<${to}>`,[250,251]);await cmd(secure,"DATA",[354]);
 const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>Чайный Мастер</h2><div style="font-size:16px;line-height:1.6;white-space:pre-line">${escapeHtml(body)}</div></div>`;
 const msg=[`From: ${fromName} <${from}>`,`To: <${to}>`,`Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,`MIME-Version: 1.0`,`Content-Type: text/html; charset=UTF-8`,`Content-Transfer-Encoding: 8bit`,"",html,"."].join("\r\n");await cmd(secure,msg,[250]);await cmd(secure,"QUIT",[221]);secure.end();
}
