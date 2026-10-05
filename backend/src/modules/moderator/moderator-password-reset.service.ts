import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { sendEmail } from "../notifications/email-transport.js";
import { hashAdminPassword } from "./moderator-password.js";

const RESET_TTL_MINUTES = 30;
const PRODUCTION_SITE_URL = "https://tea-master-team.ru";
const DEVELOPMENT_SITE_URL = "http://localhost:5173";

function getSiteUrl(): string {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return process.env.NODE_ENV === "production"
    ? PRODUCTION_SITE_URL
    : DEVELOPMENT_SITE_URL;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestAdminPasswordReset(): Promise<void> {
  const corporateEmail = process.env.MAIL_FROM?.trim();

  const admin = corporateEmail
    ? await prisma.admin_users.findFirst({
        where: {
          email: { equals: corporateEmail, mode: "insensitive" },
          is_active: true
        }
      })
    : await prisma.admin_users.findFirst({
        where: { is_active: true },
        orderBy: { created_at: "asc" }
      });

  if (!admin) return;

  const now = new Date();
  await prisma.admin_password_reset_tokens.updateMany({
    where: { admin_id: admin.id, used_at: null },
    data: { used_at: now }
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.admin_password_reset_tokens.create({
    data: {
      admin_id: admin.id,
      token_hash: tokenHash(token),
      expires_at: new Date(now.getTime() + RESET_TTL_MINUTES * 60_000)
    }
  });

  const resetUrl = `${getSiteUrl()}/admin/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail(
    admin.email,
    "Восстановление пароля администратора",
    [
      "Получен запрос на изменение пароля панели управления «Чайный Мастер».",
      "",
      "Для установки нового пароля перейдите по ссылке:",
      resetUrl,
      "",
      `Ссылка действует ${RESET_TTL_MINUTES} минут и может быть использована только один раз.`,
      "",
      "Если вы не запрашивали изменение пароля, проигнорируйте это письмо."
    ].join("\n")
  );
}

export async function resetAdminPassword(token: string, newPassword: string): Promise<boolean> {
  if (!token || newPassword.length < 10) return false;

  const reset = await prisma.admin_password_reset_tokens.findUnique({
    where: { token_hash: tokenHash(token) },
    include: { admin: true }
  });

  const now = new Date();
  if (!reset || reset.used_at || reset.expires_at <= now || !reset.admin.is_active) return false;

  await prisma.$transaction([
    prisma.admin_users.update({
      where: { id: reset.admin_id },
      data: {
        password_hash: hashAdminPassword(newPassword),
        password_changed_at: now,
        updated_at: now
      }
    }),
    prisma.admin_password_reset_tokens.updateMany({
      where: { admin_id: reset.admin_id, used_at: null },
      data: { used_at: now }
    })
  ]);

  return true;
}
