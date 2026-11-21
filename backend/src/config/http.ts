import type { Request } from "express";

/**
 * Единый список источников, которым разрешены CORS-запросы с cookie
 * и изменяющие запросы к административному API.
 */
export const ALLOWED_ORIGINS: readonly string[] = [
  "http://localhost:5173",
  "https://tea-master-team.ru",
  "https://www.tea-master-team.ru"
];

const allowedOriginSet = new Set(ALLOWED_ORIGINS);

export function isAllowedOrigin(origin: string | undefined): boolean {
  return Boolean(origin && allowedOriginSet.has(origin));
}

/** Читает значение cookie из заголовка запроса без сторонних зависимостей. */
export function readCookie(req: Request, name: string): string | null {
  const prefix = `${name}=`;
  const part = (req.headers.cookie ?? "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return part ? part.slice(prefix.length) : null;
}
