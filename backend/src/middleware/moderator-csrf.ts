import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { readAdminSession } from "../modules/moderator/moderator-session.js";

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://tea-master-team.ru",
  "https://www.tea-master-team.ru"
]);
const publicActions = new Set([
  "/login",
  "/password-reset/request",
  "/password-reset/confirm"
]);

function sessionCookie(req: Request): string | null {
  const part = (req.headers.cookie || "").split(";").map(x => x.trim())
    .find(x => x.startsWith("tea_admin_session="));
  return part ? part.slice("tea_admin_session=".length) : null;
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
  if (!origin || !allowedOrigins.has(origin)) {
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
