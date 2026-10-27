import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { verifyAdminPasswordHash } from "./moderator-password.js";
import { clientIp, consumeAuthLimit } from "../security/auth-rate-limit.js";
import {
  clearAdminSessionCookie, createAdminSessionToken, isAdminAuthConfigured,
  readAdminSession, setAdminSessionCookie, verifyAdminPassword
} from "./moderator-session.js";

export async function loginModeratorController(req: Request, res: Response): Promise<void> {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  // Limit requests before running expensive password hashing. The database
  // handles concurrent requests atomically and persists counters across restarts.
  try {
    const ip = clientIp(req);
    const allowed = await consumeAuthLimit("admin-login-ip-15m", ip, 30, 900)
      && await consumeAuthLimit("admin-login-user-15m", username || "(empty)", 5, 900);
    if (!allowed) {
      res.setHeader("Retry-After", "900");
      res.status(429).json({ error: { code: "ADMIN_RATE_LIMITED", message: "Слишком много попыток входа. Попробуйте позже." } });
      return;
    }
  } catch (error) {
    console.error("Admin rate limiter unavailable", error);
    res.status(503).json({ error: { code: "ADMIN_AUTH_UNAVAILABLE", message: "Вход временно недоступен" } });
    return;
  }

  if (!username || !password || !process.env.ADMIN_SESSION_SECRET?.trim()) {
    res.status(401).json({ error: { code: "ADMIN_INVALID_CREDENTIALS", message: "Неверный логин или пароль" } });
    return;
  }

  const dbAdmin = await prisma.admin_users.findUnique({ where: { username } });
  const dbValid = Boolean(dbAdmin?.is_active && verifyAdminPasswordHash(password, dbAdmin.password_hash));

  // Compatibility with legacy .env admin credentials.
  const envUsername = process.env.ADMIN_USERNAME?.trim() ?? "";
  const envValid = !dbAdmin && isAdminAuthConfigured() && username === envUsername && verifyAdminPassword(password);

  if (!dbValid && !envValid) {
    res.status(401).json({ error: { code: "ADMIN_INVALID_CREDENTIALS", message: "Неверный логин или пароль" } });
    return;
  }

  const token = createAdminSessionToken(username);
  if (!token) {
    res.status(503).json({ error: { code: "ADMIN_AUTH_NOT_CONFIGURED", message: "Вход администратора не настроен" } });
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



