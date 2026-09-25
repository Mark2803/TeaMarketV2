import { sendTemplateEmail } from "../notifications/notification.service.js";
import net from "node:net";
import tls from "node:tls";

export interface AuthCodeProvider {
  sendPhoneCode(phone: string, code: string): Promise<void>;
  sendEmailCode(email: string, code: string): Promise<void>;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

function readReply(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1);
      if (last && /^\d{3} /.test(last)) { cleanup(); resolve(buffer); }
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { socket.off("data", onData); socket.off("error", onError); };
    socket.on("data", onData); socket.on("error", onError);
  });
}

async function command(socket: net.Socket | tls.TLSSocket, value: string, expected: number[]) {
  socket.write(`${value}\r\n`);
  const reply = await readReply(socket);
  const code = Number(reply.slice(0, 3));
  if (!expected.includes(code)) throw new Error(`SMTP ${value.split(" ")[0]}: ${reply.trim()}`);
}

async function sendSmtpMail(to: string, code: string): Promise<void> {
  const host = requiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || "2525");
  const user = requiredEnv("SMTP_USER");
  const password = requiredEnv("SMTP_PASSWORD");
  const from = requiredEnv("MAIL_FROM");
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Чайный Мастер";

  const plain = await new Promise<net.Socket>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => resolve(socket));
    socket.setTimeout(15000, () => socket.destroy(new Error("SMTP timeout")));
    socket.once("error", reject);
  });
  await readReply(plain);
  await command(plain, "EHLO tea-master-team.ru", [250]);
  await command(plain, "STARTTLS", [220]);

  const secure = tls.connect({ socket: plain, servername: host, minVersion: "TLSv1.2" });
  await new Promise<void>((resolve, reject) => { secure.once("secureConnect", resolve); secure.once("error", reject); });
  await command(secure, "EHLO tea-master-team.ru", [250]);
  await command(secure, "AUTH LOGIN", [334]);
  await command(secure, Buffer.from(user).toString("base64"), [334]);
  await command(secure, Buffer.from(password).toString("base64"), [235]);
  await command(secure, `MAIL FROM:<${from}>`, [250]);
  await command(secure, `RCPT TO:<${to}>`, [250, 251]);
  await command(secure, "DATA", [354]);

  const subject = "Код входа — Чайный Мастер";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Чайный Мастер</h2><p>Код для входа в личный кабинет:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>Код действует 5 минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.</p></div>`;
  const message = [
    `From: ${fromName} <${from}>`, `To: <${to}>`, `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", html, "."
  ].join("\r\n");
  await command(secure, message, [250]);
  await command(secure, "QUIT", [221]);
  secure.end();
}

class DefaultAuthCodeProvider implements AuthCodeProvider {
  async sendPhoneCode(phone: string, code: string): Promise<void> {
    console.log(`[AUTH TEST] Код для ${phone}: ${code}`);
  }
  async sendEmailCode(email: string, code: string): Promise<void> {
    const result = await sendTemplateEmail(
      "registration_confirmation",
      email,
      { code, expires_minutes: 5 }
    );
    if (!result.sent) {
      throw new Error("Email-уведомления отключены или письмо не отправлено");
    }
  }
}

export const authCodeProvider: AuthCodeProvider = new DefaultAuthCodeProvider();
