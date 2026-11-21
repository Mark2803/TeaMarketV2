import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { isAllowedOrigin, readCookie } from "../config/http.js";
import { ADMIN_SESSION_COOKIE, readAdminSession } from "../modules/moderator/moderator-session.js";

const publicActions = new Set([
  "/login",
  "/password-reset/request",
  "/password-reset/confirm"
]);

function sessionCookie(req: Request): string | null {
  return readCookie(req, ADMIN_SESSION_COOKIE);
}

function tokenFor(cookie: string): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update("csrf:v1:").update(cookie).digest("base64url");
}

function equals(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function moderatorCsrfToken(req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (!(await readAdminSession(req))) {
    res.status(401).json({ error: { code: "MODERATOR_UNAUTHORIZED", message: "Требуется вход администратора" } });
    return;
  }
  const cookie = sessionCookie(req);
  const token = cookie && tokenFor(cookie);
  if (!token) {
    res.status(503).json({ error: { code: "CSRF_UNAVAILABLE", message: "Защита запросов не настроена" } });
    return;
  }
  res.json({ token });
}

export function moderatorCsrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }

  // Unsafe browser requests must originate from our storefront/admin UI.
  const origin = req.get("origin");
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: { code: "CSRF_ORIGIN_REJECTED", message: "Недопустимый источник запроса" } });
    return;
  }

  if (publicActions.has(req.path)) { next(); return; }

  const cookie = sessionCookie(req);
  const expected = cookie && tokenFor(cookie);
  const supplied = req.get("x-csrf-token");
  if (!expected || !supplied || !equals(expected, supplied)) {
    res.status(403).json({ error: { code: "CSRF_TOKEN_INVALID", message: "Недействительное подтверждение запроса" } });
    return;
  }
  next();
}
