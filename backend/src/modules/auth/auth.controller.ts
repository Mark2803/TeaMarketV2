import type { Request, Response } from "express";
import { requestAuthCodeSchema, verifyAuthCodeSchema } from "./auth.schemas.js";
import { requestAuthCode, revokeAuthSession, verifyAuthCode } from "./auth.service.js";
import { clientIp, consumeAuthLimit } from "../security/auth-rate-limit.js";

function tooMany(res: Response): void {
  res.setHeader("Retry-After", "900");
  res.status(429).json({ error: {
    code: "AUTH_RATE_LIMITED",
    message: "Слишком много попыток. Попробуйте позже."
  } });
}

function unavailable(res: Response): void {
  res.status(503).json({ error: {
    code: "AUTH_TEMPORARILY_UNAVAILABLE",
    message: "Авторизация временно недоступна. Попробуйте позже."
  } });
}

function identityOf(data: { channel: string; email?: string; phone?: string }): string {
  return `${data.channel}:${data.channel === "email" ? data.email : data.phone}`;
}

export async function requestAuthCodeController(req: Request, res: Response): Promise<void> {
  const parsed = requestAuthCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_AUTH_DATA", message: "Укажите корректный email или номер телефона", details: parsed.error.flatten() } });
    return;
  }

  // Until a real SMS provider is connected, never issue a phone code.
  if (parsed.data.channel === "phone") {
    res.status(503).json({ error: { code: "PHONE_AUTH_UNAVAILABLE", message: "Вход по телефону временно недоступен. Используйте email." } });
    return;
  }

  const identity = identityOf(parsed.data);
  const ip = clientIp(req);
  try {
    const allowed =
      await consumeAuthLimit("request-identity-60s", identity, 1, 60)
      && await consumeAuthLimit("request-identity-hour", identity, 5, 3600)
      && await consumeAuthLimit("request-ip-hour", ip, 30, 3600);
    if (!allowed) { tooMany(res); return; }
  } catch (error) {
    console.error("Auth rate limiter unavailable", error);
    unavailable(res);
    return;
  }

  const result = await requestAuthCode(parsed.data);
  res.json({ data: { expiresInSeconds: result.expiresInSeconds } });
}

export async function verifyAuthCodeController(req: Request, res: Response): Promise<void> {
  const parsed = verifyAuthCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_AUTH_DATA", message: "Некорректные данные подтверждения", details: parsed.error.flatten() } });
    return;
  }

  if (parsed.data.channel === "phone") {
    res.status(503).json({ error: { code: "PHONE_AUTH_UNAVAILABLE", message: "Вход по телефону временно недоступен. Используйте email." } });
    return;
  }

  try {
    const allowed =
      await consumeAuthLimit("verify-identity-15m", identityOf(parsed.data), 5, 900)
      && await consumeAuthLimit("verify-ip-15m", clientIp(req), 30, 900);
    if (!allowed) { tooMany(res); return; }
  } catch (error) {
    console.error("Auth rate limiter unavailable", error);
    unavailable(res);
    return;
  }

  const result = await verifyAuthCode(parsed.data);
  if (!result.success) {
    switch (result.error) {
      case "AUTH_CODE_NOT_FOUND":
        res.status(404).json({ error: { code: "AUTH_CODE_NOT_FOUND", message: "Активный код подтверждения не найден" } });
        return;
      case "AUTH_CODE_EXPIRED":
        res.status(410).json({ error: { code: "AUTH_CODE_EXPIRED", message: "Срок действия кода истёк" } });
        return;
      case "AUTH_CODE_INVALID":
        res.status(400).json({ error: { code: "AUTH_CODE_INVALID", message: "Неверный код подтверждения", details: { attemptsLeft: result.attemptsLeft } } });
        return;
      case "AUTH_CODE_ATTEMPTS_EXCEEDED":
        tooMany(res);
        return;
    }
  }

  res.json({ data: { token: result.token, expiresAt: result.expiresAt, customer: result.customer } });
}

export async function logoutAuthController(req: Request, res: Response): Promise<void> {
  const authorization = req.headers.authorization;
  if (!req.customer || !authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Требуется авторизация" } });
    return;
  }
  await revokeAuthSession(authorization.substring(7));
  res.json({ data: { success: true } });
}



