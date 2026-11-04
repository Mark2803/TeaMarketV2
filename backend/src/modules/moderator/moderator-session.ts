import {
  createHmac,
  createHash,
  timingSafeEqual
} from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { verifyAdminPasswordHash } from "./moderator-password.js";

const COOKIE_NAME = "tea_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  username: string;
  expiresAt: number;
  credentialFingerprint: string;
};

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return (
    left.length === right.length
    && timingSafeEqual(left, right)
  );
}

export function verifyAdminPassword(password: string): boolean {
  const configured = process.env.ADMIN_PASSWORD_HASH?.trim();
  return configured ? verifyAdminPasswordHash(password, configured) : false;
}

function credentialFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url");
}

export function createAdminSessionToken(
  username: string,
  passwordHash: string
): string | null {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  const payload: SessionPayload = {
    username,
    credentialFingerprint: credentialFingerprint(passwordHash),
    expiresAt:
      Math.floor(Date.now() / 1000)
      + SESSION_TTL_SECONDS
  };

  const encoded = encode(
    JSON.stringify(payload)
  );

  return `${encoded}.${sign(encoded, secret)}`;
}

export function readAdminSessionToken(
  req: Request
): SessionPayload | null {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  const cookieHeader =
    req.headers.cookie ?? "";

  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) =>
      part.startsWith(`${COOKIE_NAME}=`)
    )
    ?.slice(COOKIE_NAME.length + 1);

  if (!raw) {
    return null;
  }

  const [encoded, signature] = raw.split(".");

  if (
    !encoded
    || !signature
    || !safeEqual(
      sign(encoded, secret),
      signature
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decode(encoded)
    ) as SessionPayload;

    if (
      !payload.username
      || typeof payload.credentialFingerprint !== "string"
      || !payload.credentialFingerprint
      || payload.expiresAt
        <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validate the signed cookie against the current administrator record.
 * Disabling an administrator or changing their password immediately
 * invalidates previously issued cookies.
 */
export async function readAdminSession(req: Request): Promise<SessionPayload | null> {
  const payload = readAdminSessionToken(req);
  if (!payload) return null;

  const admin = await prisma.admin_users.findUnique({
    where: { username: payload.username },
    select: { is_active: true, password_hash: true }
  });

  let currentHash: string | null = null;
  if (admin) {
    if (!admin.is_active) return null;
    currentHash = admin.password_hash;
  } else if (
    isAdminAuthConfigured()
    && payload.username === process.env.ADMIN_USERNAME?.trim()
  ) {
    currentHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  }

  if (!currentHash) return null;
  const expected = credentialFingerprint(currentHash);
  return safeEqual(expected, payload.credentialFingerprint) ? payload : null;
}

export function setAdminSessionCookie(
  res: Response,
  token: string
): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/api/moderator"
  });
}

export function clearAdminSessionCookie(
  res: Response
): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/moderator"
  });
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim()
    && process.env.ADMIN_PASSWORD_HASH?.trim()
    && getSessionSecret()
  );
}