import net from "node:net";
import tls from "node:tls";
import { randomBytes } from "node:crypto";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

function reply(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      const last = lines.filter(Boolean).at(-1);
      if (last && /^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const onClose = () => { cleanup(); reject(new Error("SMTP connection closed")); };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function cmd(socket: net.Socket | tls.TLSSocket, value: string, expected: number[], label?: string): Promise<void> {
  const waiting = reply(socket);
  socket.write(`${value}\r\n`);
  const response = await waiting;
  if (!expected.includes(Number(response.slice(0, 3)))) {
    throw new Error(`SMTP ${label || value.split(" ")[0]}: ${response.trim()}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]!);
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(cleanHeader(value), "utf8").toString("base64")}?=`;
}

function encodeBody(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function dotStuff(message: string): string {
  return message.replace(/(^|\r\n)\./g, "$1..");
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const host = required("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || "2525");
  const user = required("SMTP_USER");
  const password = required("SMTP_PASSWORD");
  const from = required("MAIL_FROM");
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Чайный Мастер";
  const recipient = to.trim();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(recipient)) throw new Error("Некорректный email получателя");
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) throw new Error("Некорректный MAIL_FROM");

  const plain = await new Promise<net.Socket>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => resolve(socket));
    socket.setTimeout(15000, () => socket.destroy(new Error("SMTP timeout")));
    socket.once("error", reject);
  });
  let secure: tls.TLSSocket | undefined;
  try {
    await reply(plain);
    await cmd(plain, "EHLO tea-master-team.ru", [250]);
    await cmd(plain, "STARTTLS", [220]);
    secure = tls.connect({ socket: plain, servername: host, minVersion: "TLSv1.2" });
    await new Promise<void>((resolve, reject) => {
      secure!.once("secureConnect", resolve);
      secure!.once("error", reject);
    });
    await cmd(secure, "EHLO tea-master-team.ru", [250]);
    await cmd(secure, "AUTH LOGIN", [334]);
    await cmd(secure, Buffer.from(user).toString("base64"), [334], "AUTH USER");
    await cmd(secure, Buffer.from(password).toString("base64"), [235], "AUTH PASSWORD");
    await cmd(secure, `MAIL FROM:<${from}>`, [250]);
    await cmd(secure, `RCPT TO:<${recipient}>`, [250, 251]);
    await cmd(secure, "DATA", [354]);

    const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>Чайный Мастер</h2><div style="font-size:16px;line-height:1.6;white-space:pre-line">${escapeHtml(body)}</div></div>`;
    const domain = from.split("@")[1];
    const messageId = `<${Date.now()}.${randomBytes(12).toString("hex")}@${domain}>`;
    const message = [
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `From: ${encodeHeader(fromName)} <${from}>`,
      `To: <${recipient}>`,
      `Reply-To: <${from}>`,
      `Subject: ${encodeHeader(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      encodeBody(html)
    ].join("\r\n");
    await cmd(secure, `${dotStuff(message)}\r\n.`, [250], "DATA BODY");
    await cmd(secure, "QUIT", [221]);
  } finally {
    secure?.destroy();
    plain.destroy();
  }
}
