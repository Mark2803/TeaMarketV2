import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();
type Messenger = "telegram" | "whatsapp" | "max";
type ContactRow = { channel: string; contact: string; is_enabled: boolean };
const defaults: Record<Messenger, ContactRow> = {
  telegram: { channel: "telegram", contact: "https://t.me/TeaMasterTeam", is_enabled: true },
  whatsapp: { channel: "whatsapp", contact: "https://wa.me/79218855660", is_enabled: true },
  max: { channel: "max", contact: "", is_enabled: true }
};
const channels: Messenger[] = ["telegram", "whatsapp", "max"];
function validContact(channel: Messenger, value: string): boolean {
  if (!value) return true;
  if (channel === "telegram") return /^https:\/\/t\.me\/[a-zA-Z0-9_]{5,32}\/?$/.test(value);
  if (channel === "whatsapp") return /^https:\/\/wa\.me\/[1-9][0-9]{6,14}\/?$/.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "max.ru" || url.hostname.endsWith(".max.ru"));
  } catch { return false; }
}
async function getContacts() {
  const rows = await prisma.$queryRaw<ContactRow[]>`SELECT channel, contact, is_enabled FROM storefront_messengers`;
  const byChannel = new Map(rows.map(row => [row.channel, row]));
  return channels.map(channel => byChannel.get(channel) ?? defaults[channel]);
}
router.get("/", async (_req, res, next) => {
  try { res.setHeader("Cache-Control", "no-store"); res.json({ data: await getContacts() }); }
  catch (error) { next(error); }
});
export const publicMessengerRouter = router;
export const adminMessengerRouter = Router();
adminMessengerRouter.put("/", async (req, res, next) => {
  try {
    const items = req.body?.data;
    if (!Array.isArray(items) || items.length !== 3 || new Set(items.map(x => x?.channel)).size !== 3 ||
      !channels.every(channel => items.some(x => x?.channel === channel))) {
      res.status(400).json({ error: { message: "Передайте настройки Telegram, WhatsApp и MAX" } }); return;
    }
    for (const item of items) {
      if (typeof item.contact !== "string" || item.contact.length > 255 ||
          typeof item.is_enabled !== "boolean" ||
          !validContact(item.channel as Messenger, item.contact.trim())) {
        res.status(400).json({ error: { message: "Некорректная ссылка мессенджера" } }); return;
      }
    }
    await prisma.$transaction(async tx => {
      for (const item of items) {
        await tx.$executeRaw`INSERT INTO storefront_messengers (channel, contact, is_enabled, updated_at)
          VALUES (${item.channel}, ${item.contact.trim()}, ${item.is_enabled}, NOW())
          ON CONFLICT (channel) DO UPDATE SET contact = EXCLUDED.contact, is_enabled = EXCLUDED.is_enabled, updated_at = NOW()`;
      }
    });
    res.json({ data: await getContacts() });
  } catch (error) { next(error); }
});
