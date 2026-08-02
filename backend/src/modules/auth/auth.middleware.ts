import type {
  NextFunction,
  Request,
  Response
} from "express";

import {
  createHash
} from "node:crypto";

import { prisma } from "../../database/prisma.js";

declare global {
  namespace Express {
    interface Request {
      customer?: {
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        username: string | null;
      };
    }
  }
}

/**
 * Возвращает SHA-256 хеш.
 */
function createSha256Hash(
  value: string
) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

/**
 * Авторизует покупателя по Bearer-токену.
 *
 * Если токен отсутствует —
 * запрос продолжает выполняться как гостевой.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    next();
    return;
  }

  const token =
    authorization.substring(
      7
    );

  const tokenHash =
    createSha256Hash(
      token
    );

  const session =
    await prisma.auth_sessions.findUnique({
      where: {
        token_hash:
          tokenHash
      },

      include: {
        customers: {
          select: {
            id: true,
            phone: true,
            name: true,
            email: true,
            username: true
          }
        }
      }
    });

  if (
    !session ||
    session.revoked_at ||
    session.expires_at <=
      new Date()
  ) {
    next();
    return;
  }

  await prisma.auth_sessions.update({
    where: {
      id:
        session.id
    },

    data: {
      last_used_at:
        new Date()
    }
  });

  req.customer =
    session.customers;

  next();
}