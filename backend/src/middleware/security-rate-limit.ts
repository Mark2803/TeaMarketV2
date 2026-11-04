import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";

type Limit = { count: number; expiresAt: number };
const buckets = new Map<string, Limit>();
let calls = 0;

function keyHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Lightweight single-process limiter. Do not trust X-Forwarded-For directly:
 * req.ip uses Express trust-proxy configuration.
 * For multiple API instances, replace this store with a shared Redis limiter.
 */
export function securityRateLimit(options: {
  name: string;
  max: number;
  windowMs: number;
  identity?: (req: Request) => string;
}): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    // Bounded cleanup of expired entries; prevents indefinite memory growth.
    if (++calls % 250 === 0) {
      for (const [key, value] of buckets) {
        if (value.expiresAt <= now) buckets.delete(key);
      }
    }

    const identity = options.identity?.(req) ?? req.ip ?? "unknown";
    const key = `${options.name}:${keyHash(identity)}`;
    let entry = buckets.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { count: 0, expiresAt: now + options.windowMs };
      buckets.set(key, entry);
    }
    if (entry.count >= options.max) {
      const seconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
      res.setHeader("Retry-After", String(seconds));
      res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Слишком много запросов. Повторите попытку позже."
        }
      });
      return;
    }
    entry.count += 1;
    next();
  };
}
