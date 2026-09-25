import type { Request, Response } from "express";
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  isAdminAuthConfigured,
  readAdminSession,
  setAdminSessionCookie,
  verifyAdminPassword
} from "./moderator-session.js";

export function loginModeratorController(req: Request, res: Response): void {
  if (!isAdminAuthConfigured()) {
    res.status(503).json({
      error: { code: "ADMIN_AUTH_NOT_CONFIGURED", message: "Вход администратора не настроен" }
    });
    return;
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const expectedUsername = process.env.ADMIN_USERNAME?.trim() ?? "";

  if (!username || !password || username !== expectedUsername || !verifyAdminPassword(password)) {
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
