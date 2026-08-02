import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";

import { prisma } from "../../database/prisma.js";

import {
  authCodeProvider
} from "./auth-code.provider.js";

import {
  AUTH_CODE_LIFETIME_MINUTES,
  AUTH_CODE_MAX_ATTEMPTS,
  AUTH_SESSION_LIFETIME_DAYS
} from "./auth.constants.js";

import type {
  RequestAuthCodeInput,
  VerifyAuthCodeInput
} from "./auth.schemas.js";

export type RequestAuthCodeResult = {
  success: true;
  expiresInSeconds: number;
};

export type VerifyAuthCodeError =
  | "AUTH_CODE_NOT_FOUND"
  | "AUTH_CODE_EXPIRED"
  | "AUTH_CODE_INVALID"
  | "AUTH_CODE_ATTEMPTS_EXCEEDED";

export type VerifyAuthCodeResult =
  | {
      success: true;
      token: string;
      expiresAt: Date;
      customer: {
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        username: string | null;
      };
    }
  | {
      success: false;
      error: VerifyAuthCodeError;
      attemptsLeft?: number;
    };

/**
 * Возвращает SHA-256 хеш значения.
 */
function createSha256Hash(
  value: string
) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

/**
 * Безопасно сравнивает два SHA-256 хеша.
 */
function compareHashes(
  firstHash: string,
  secondHash: string
) {
  const firstBuffer =
    Buffer.from(
      firstHash,
      "hex"
    );

  const secondBuffer =
    Buffer.from(
      secondHash,
      "hex"
    );

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    firstBuffer,
    secondBuffer
  );
}

/**
 * Создаёт шестизначный одноразовый код.
 */
function createAuthCode() {
  return randomInt(
    100000,
    1000000
  ).toString();
}

/**
 * Создаёт случайный токен сессии.
 */
function createSessionToken() {
  return randomBytes(32)
    .toString("hex");
}

/**
 * Запрашивает одноразовый код авторизации.
 *
 * В тестовом режиме код выводится
 * в консоль backend.
 */
export async function requestAuthCode(
  input: RequestAuthCodeInput
): Promise<RequestAuthCodeResult> {
  const code =
    createAuthCode();

  const codeHash =
    createSha256Hash(code);

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime()
      + AUTH_CODE_LIFETIME_MINUTES
      * 60
      * 1000
    );

  await prisma.$transaction(
    async (transaction) => {
      await transaction
        .auth_codes
        .updateMany({
          where: {
            phone:
              input.phone,

            used_at:
              null
          },

          data: {
            used_at:
              now
          }
        });

      await transaction
        .auth_codes
        .create({
          data: {
            phone:
              input.phone,

            code_hash:
              codeHash,

            expires_at:
              expiresAt,

            max_attempts:
              AUTH_CODE_MAX_ATTEMPTS
          }
        });
    }
  );

  await authCodeProvider.sendCode(
    input.phone,
    code
  );

  return {
    success: true,

    expiresInSeconds:
      AUTH_CODE_LIFETIME_MINUTES
      * 60
  };
}

/**
 * Проверяет одноразовый код,
 * создаёт покупателя при необходимости
 * и выдаёт токен сессии.
 */
export async function verifyAuthCode(
  input: VerifyAuthCodeInput
): Promise<VerifyAuthCodeResult> {
  const now =
    new Date();

  const authCode =
    await prisma.auth_codes.findFirst({
      where: {
        phone:
          input.phone,

        used_at:
          null
      },

      orderBy: {
        created_at:
          "desc"
      }
    });

  if (!authCode) {
    return {
      success: false,

      error:
        "AUTH_CODE_NOT_FOUND"
    };
  }

  if (
    authCode.expires_at <= now
  ) {
    await prisma.auth_codes.update({
      where: {
        id:
          authCode.id
      },

      data: {
        used_at:
          now
      }
    });

    return {
      success: false,

      error:
        "AUTH_CODE_EXPIRED"
    };
  }

  if (
    authCode.attempts >=
    authCode.max_attempts
  ) {
    return {
      success: false,

      error:
        "AUTH_CODE_ATTEMPTS_EXCEEDED",

      attemptsLeft: 0
    };
  }

  const submittedCodeHash =
    createSha256Hash(
      input.code
    );

  const codeIsValid =
    compareHashes(
      authCode.code_hash,
      submittedCodeHash
    );

  if (!codeIsValid) {
    const attempts =
      authCode.attempts + 1;

    const attemptsExceeded =
      attempts >=
      authCode.max_attempts;

    await prisma.auth_codes.update({
      where: {
        id:
          authCode.id
      },

      data: {
        attempts,

        used_at:
          attemptsExceeded
            ? now
            : null
      }
    });

    return {
      success: false,

      error:
        attemptsExceeded
          ? "AUTH_CODE_ATTEMPTS_EXCEEDED"
          : "AUTH_CODE_INVALID",

      attemptsLeft:
        Math.max(
          authCode.max_attempts
          - attempts,
          0
        )
    };
  }

  const sessionToken =
    createSessionToken();

  const sessionTokenHash =
    createSha256Hash(
      sessionToken
    );

  const sessionExpiresAt =
    new Date(
      now.getTime()
      + AUTH_SESSION_LIFETIME_DAYS
      * 24
      * 60
      * 60
      * 1000
    );

  const customer =
    await prisma.$transaction(
      async (transaction) => {
        await transaction
          .auth_codes
          .update({
            where: {
              id:
                authCode.id
            },

            data: {
              used_at:
                now
            }
          });

        const currentCustomer =
          await transaction
            .customers
            .upsert({
              where: {
                phone:
                  input.phone
              },

              update: {},

              create: {
                phone:
                  input.phone
              },

              select: {
                id: true,
                phone: true,
                name: true,
                email: true,
                username: true
              }
            });

        await transaction
          .auth_sessions
          .create({
            data: {
              customer_id:
                currentCustomer.id,

              token_hash:
                sessionTokenHash,

              expires_at:
                sessionExpiresAt,

              last_used_at:
                now
            }
          });

        return currentCustomer;
      }
    );

  return {
    success: true,

    token:
      sessionToken,

    expiresAt:
      sessionExpiresAt,

    customer
  };
}