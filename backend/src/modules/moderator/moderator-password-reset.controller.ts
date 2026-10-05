import type { Request, Response } from "express";
import { requestAdminPasswordReset, resetAdminPassword } from "./moderator-password-reset.service.js";

const GENERIC_MESSAGE = "Ссылка для восстановления пароля отправлена на корпоративную почту администратора";

export async function requestAdminPasswordResetController(_req: Request, res: Response): Promise<void> {
  try {
    await requestAdminPasswordReset();
    res.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Admin password reset request failed", error);
    res.json({ ok: true, message: GENERIC_MESSAGE });
  }
}

export async function resetAdminPasswordController(req: Request, res: Response): Promise<void> {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (password.length < 10) {
    res.status(400).json({
      error: { code: "ADMIN_PASSWORD_TOO_SHORT", message: "Пароль должен содержать не менее 10 символов" }
    });
    return;
  }

  const changed = await resetAdminPassword(token, password);
  if (!changed) {
    res.status(400).json({
      error: { code: "ADMIN_RESET_TOKEN_INVALID", message: "Ссылка недействительна или срок её действия истёк" }
    });
    return;
  }

  res.json({ ok: true, message: "Пароль изменён" });
}
