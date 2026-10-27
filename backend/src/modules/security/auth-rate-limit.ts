import { createHash } from "node:crypto";
import { prisma } from "../../database/prisma.js";

/** Atomic, PostgreSQL-backed fixed-window limiter. Keys never store raw IPs or identities. */
export async function consumeAuthLimit(
  scope: string,
  identifier: string,
  maximum: number,
  windowSeconds: number
): Promise<boolean> {
  const key = createHash("sha256")
    .update(`${scope}\0${identifier.trim().toLowerCase()}`)
    .digest("hex");

  const rows = await prisma.$queryRaw<Array<{ hits: number }>>`
    INSERT INTO auth_rate_limits (key, window_started_at, hits)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE
        WHEN auth_rate_limits.window_started_at <= now() - make_interval(secs => ${windowSeconds})
          THEN 1
        ELSE auth_rate_limits.hits + 1
      END,
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at <= now() - make_interval(secs => ${windowSeconds})
          THEN now()
        ELSE auth_rate_limits.window_started_at
      END
    RETURNING hits
  `;
  return (rows[0]?.hits ?? maximum + 1) <= maximum;
}

export function clientIp(req: { ip?: string | undefined; socket: { remoteAddress?: string | undefined } }): string {
  // Do not trust arbitrary X-Forwarded-For headers. Configure Express trust proxy
  // only for the actual reverse proxy before relying on req.ip.
  return req.ip || req.socket.remoteAddress || "unknown";
}



