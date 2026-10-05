import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { verifyAdminPasswordHash } from "./moderator-password.js";
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  isAdminAuthConfigured,
  readAdminSession,
  setAdminSessionCookie,
  verifyAdminPassword
} from "./moderator-session.js";

export async function loginModeratorController(req: Request, res: Response): Promise<void> {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!username || !password || !process.env.ADMIN_SESSION_SECRET?.trim()) {
    res.status(401).json({
      error: { code: "ADMIN_INVALID_CREDENTIALS", message: "Неверный логин или пароль" }
    });
    return;
  }

  const dbAdmin = await prisma.admin_users.findUnique({ where: { username } });
  const dbValid = Boolean(
    dbAdmin?.is_active
    && verifyAdminPasswordHash(password, dbAdmin.password_hash)
  );

  // Совместимость на период переноса существующего администратора из .env в БД.
  const envUsername = process.env.ADMIN_USERNAME?.trim() ?? "";
  const envValid = !dbAdmin
    && isAdminAuthConfigured()
    && username === envUsername
    && verifyAdminPassword(password);

  if (!dbValid && !envValid) {
    res.status(401).json({
      error: { code: "ADMIN_INVALID_CREDENTIALS", message: "Неверный логин или пароль" }
    });
    return;
  }

  const token = createAdminSessionToken(username);
  if (!token) {
    res.status(503).json({
      error: { code: "ADMIN_AUTH_NOT_CONFIGURED", message: "Вход администратора не настроен" }
    });
    return;
  }

  setAdminSessionCookie(res, token);
  res.json({ authenticated: true, username });
}

export function logoutModeratorController(_req: Request, res: Response): void {
  clearAdminSessionCookie(res);
  res.json({ authenticated: false });
}

export function getModeratorSessionController(req: Request, res: Response): void {
  const session = readAdminSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, username: session.username });
}
