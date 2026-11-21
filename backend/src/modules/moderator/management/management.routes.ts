import { createHash, randomBytes, randomInt } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../../database/prisma.js";
import { sendEmail } from "../../notifications/email-transport.js";
import { hashAdminPassword, verifyAdminPasswordHash } from "../moderator-password.js";

/**
 * Раздел «Менеджмент» — закрытая библиотека служебных инструментов.
 * Доступ: вход в админку (moderatorAuthMiddleware) + PIN-код.
 * PIN устанавливается/меняется только по коду из письма на корпоративную почту.
 * После ввода PIN выдаётся короткий токен; фронтенд держит его только в памяти страницы,
 * поэтому при каждом входе в раздел PIN вводится заново.
 *
 * Таблицы — миграция 350_management; Prisma-клиент не перегенерирован, поэтому SQL.
 */
const router = Router();

const MANAGEMENT_EMAIL = () => process.env.MANAGEMENT_EMAIL?.trim() || "info@tea-master-team.ru";
const CODE_TTL_MIN = 15;
const CODE_RESEND_SEC = 60;
const CODE_MAX_ATTEMPTS = 5;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MIN = 15;
const TOKEN_TTL_MIN = 60;

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const maskEmail = (email: string) => email.replace(/^(.)(.*)(@.*)$/, (_m, a: string, b: string, c: string) => a + "*".repeat(Math.max(1, b.length)) + c);
const fail = (res: Response, status: number, code: string, message: string) => { res.status(status).json({ error: { code, message } }); };

type Settings = { pin_hash: string | null; failed_attempts: number; locked_until: Date | null };
async function settings(): Promise<Settings> {
  const rows = await prisma.$queryRaw<Settings[]>`SELECT pin_hash, failed_attempts, locked_until FROM management_settings WHERE id = 1`;
  return rows[0] ?? { pin_hash: null, failed_attempts: 0, locked_until: null };
}

router.get("/status", async (_req, res, next) => {
  try {
    const current = await settings();
    res.json({ data: {
      pinSet: Boolean(current.pin_hash),
      email: maskEmail(MANAGEMENT_EMAIL()),
      lockedUntil: current.locked_until && current.locked_until > new Date() ? current.locked_until : null
    } });
  } catch (error) { next(error); }
});

/** Код подтверждения для установки/смены PIN — на корпоративную почту. */
router.post("/pin/request-code", async (_req, res, next) => {
  try {
    const last = await prisma.$queryRaw<Array<{ created_at: Date }>>`SELECT created_at FROM management_pin_codes ORDER BY created_at DESC LIMIT 1`;
    if (last[0] && Date.now() - last[0].created_at.getTime() < CODE_RESEND_SEC * 1000) {
      fail(res, 429, "MANAGEMENT_CODE_TOO_OFTEN", "Код уже отправлен. Повторить можно через минуту.");
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await prisma.$executeRaw`UPDATE management_pin_codes SET used_at = now() WHERE used_at IS NULL`;
    await prisma.$executeRaw`INSERT INTO management_pin_codes (code_hash, expires_at) VALUES (${sha256(code)}, ${minutesFromNow(CODE_TTL_MIN)})`;
    await sendEmail(MANAGEMENT_EMAIL(), "Код для PIN раздела «Менеджмент»", [
      "Запрошена установка или смена PIN-кода раздела «Менеджмент» в панели управления «Чайный Маркет».",
      "",
      `Код подтверждения: ${code}`,
      "",
      `Код действует ${CODE_TTL_MIN} минут. Если вы не запрашивали смену PIN, проигнорируйте письмо и смените пароль админки.`
    ].join("\n"));
    res.json({ data: { sent: true, email: maskEmail(MANAGEMENT_EMAIL()) } });
  } catch (error) { next(error); }
});

const setPinSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Код — 6 цифр"),
  pin: z.string().regex(/^\d{4,8}$/, "PIN — от 4 до 8 цифр")
});

router.post("/pin", async (req, res, next) => {
  try {
    const parsed = setPinSchema.safeParse(req.body);
    if (!parsed.success) { fail(res, 400, "MANAGEMENT_INVALID_INPUT", parsed.error.issues[0]?.message ?? "Некорректные данные"); return; }
    const active = await prisma.$queryRaw<Array<{ id: string; code_hash: string; attempts: number }>>`
      SELECT id, code_hash, attempts FROM management_pin_codes
      WHERE used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`;
    const row = active[0];
    if (!row) { fail(res, 400, "MANAGEMENT_CODE_EXPIRED", "Код не найден или истёк. Запросите новый."); return; }
    if (row.code_hash !== sha256(parsed.data.code)) {
      const attempts = row.attempts + 1;
      if (attempts >= CODE_MAX_ATTEMPTS) await prisma.$executeRaw`UPDATE management_pin_codes SET attempts = ${attempts}, used_at = now() WHERE id = ${row.id}::uuid`;
      else await prisma.$executeRaw`UPDATE management_pin_codes SET attempts = ${attempts} WHERE id = ${row.id}::uuid`;
      fail(res, 400, "MANAGEMENT_CODE_INVALID", attempts >= CODE_MAX_ATTEMPTS ? "Слишком много ошибок. Запросите новый код." : "Неверный код подтверждения.");
      return;
    }
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE management_pin_codes SET used_at = now() WHERE id = ${row.id}::uuid`,
      prisma.$executeRaw`UPDATE management_settings SET pin_hash = ${hashAdminPassword(parsed.data.pin)}, failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = 1`,
      prisma.$executeRaw`DELETE FROM management_access_tokens`
    ]);
    sendEmail(MANAGEMENT_EMAIL(), "PIN раздела «Менеджмент» изменён",
      "PIN-код раздела «Менеджмент» в панели управления «Чайный Маркет» был установлен или изменён.\nЕсли это были не вы — срочно смените пароль админки и PIN.")
      .catch((error) => console.error("Management PIN notice failed", error));
    res.json({ data: { pinSet: true } });
  } catch (error) { next(error); }
});

router.post("/unlock", async (req, res, next) => {
  try {
    const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
    const current = await settings();
    if (!current.pin_hash) { fail(res, 409, "MANAGEMENT_PIN_NOT_SET", "PIN ещё не установлен."); return; }
    if (current.locked_until && current.locked_until > new Date()) {
      fail(res, 429, "MANAGEMENT_LOCKED", `Слишком много неверных попыток. Раздел заблокирован до ${current.locked_until.toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })} (МСК).`);
      return;
    }
    if (!/^\d{4,8}$/.test(pin) || !verifyAdminPasswordHash(pin, current.pin_hash)) {
      const attempts = current.failed_attempts + 1;
      if (attempts >= PIN_MAX_ATTEMPTS) {
        await prisma.$executeRaw`UPDATE management_settings SET failed_attempts = 0, locked_until = ${minutesFromNow(PIN_LOCK_MIN)} WHERE id = 1`;
        sendEmail(MANAGEMENT_EMAIL(), "Блокировка раздела «Менеджмент»",
          `${PIN_MAX_ATTEMPTS} раз подряд введён неверный PIN раздела «Менеджмент». Раздел заблокирован на ${PIN_LOCK_MIN} минут.\nЕсли это были не вы — смените пароль админки и PIN.`)
          .catch((error) => console.error("Management lock notice failed", error));
        fail(res, 429, "MANAGEMENT_LOCKED", `Неверный PIN. Раздел заблокирован на ${PIN_LOCK_MIN} минут.`);
      } else {
        await prisma.$executeRaw`UPDATE management_settings SET failed_attempts = ${attempts} WHERE id = 1`;
        fail(res, 401, "MANAGEMENT_PIN_INVALID", `Неверный PIN. Осталось попыток: ${PIN_MAX_ATTEMPTS - attempts}.`);
      }
      return;
    }
    const token = randomBytes(32).toString("base64url");
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE management_settings SET failed_attempts = 0, locked_until = NULL WHERE id = 1`,
      prisma.$executeRaw`DELETE FROM management_access_tokens WHERE expires_at <= now()`,
      prisma.$executeRaw`INSERT INTO management_access_tokens (token_hash, expires_at) VALUES (${sha256(token)}, ${minutesFromNow(TOKEN_TTL_MIN)})`
    ]);
    res.json({ data: { token } });
  } catch (error) { next(error); }
});

/** Всё ниже — только с токеном, полученным после ввода PIN (заголовок X-Management-Token). */
async function requireManagementToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.get("X-Management-Token") ?? "";
    if (token) {
      const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok FROM management_access_tokens WHERE token_hash = ${sha256(token)} AND expires_at > now()`;
      if (rows.length) { next(); return; }
    }
    fail(res, 401, "MANAGEMENT_LOCKED_SECTION", "Введите PIN-код раздела «Менеджмент».");
  } catch (error) { next(error); }
}

router.post("/lock", requireManagementToken, async (req, res, next) => {
  try {
    await prisma.$executeRaw`DELETE FROM management_access_tokens WHERE token_hash = ${sha256(req.get("X-Management-Token") ?? "")}`;
    res.json({ data: { locked: true } });
  } catch (error) { next(error); }
});

/** Библиотека служебных инструментов. Пока пустая — инструменты добавляются сюда. */
router.get("/tools", requireManagementToken, (_req, res) => {
  res.json({ data: [] as Array<{ id: string; title: string; description: string }> });
});

export default router;
