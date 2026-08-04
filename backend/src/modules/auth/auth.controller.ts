import type {
  Request,
  Response
} from "express";

import {
  requestAuthCodeSchema,
  verifyAuthCodeSchema
} from "./auth.schemas.js";

import {
  requestAuthCode,
  revokeAuthSession,
  verifyAuthCode
} from "./auth.service.js";

export async function requestAuthCodeController(
  req: Request,
  res: Response
): Promise<void> {
  const bodyResult =
    requestAuthCodeSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_AUTH_DATA",

        message:
          "Некорректный номер телефона",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await requestAuthCode(
      bodyResult.data
    );

  res.json({
    data: {
      expiresInSeconds:
        result.expiresInSeconds
    }
  });
}

export async function verifyAuthCodeController(
  req: Request,
  res: Response
): Promise<void> {
  const bodyResult =
    verifyAuthCodeSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_AUTH_DATA",

        message:
          "Некорректные данные подтверждения",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await verifyAuthCode(
      bodyResult.data
    );

  if (!result.success) {
    switch (result.error) {
      case "AUTH_CODE_NOT_FOUND":
        res.status(404).json({
          error: {
            code:
              "AUTH_CODE_NOT_FOUND",

            message:
              "Активный код подтверждения не найден"
          }
        });

        return;

      case "AUTH_CODE_EXPIRED":
        res.status(410).json({
          error: {
            code:
              "AUTH_CODE_EXPIRED",

            message:
              "Срок действия кода истёк"
          }
        });

        return;

      case "AUTH_CODE_INVALID":
        res.status(400).json({
          error: {
            code:
              "AUTH_CODE_INVALID",

            message:
              "Неверный код подтверждения",

            details: {
              attemptsLeft:
                result.attemptsLeft
            }
          }
        });

        return;

      case "AUTH_CODE_ATTEMPTS_EXCEEDED":
        res.status(429).json({
          error: {
            code:
              "AUTH_CODE_ATTEMPTS_EXCEEDED",

            message:
              "Превышено количество попыток ввода кода",

            details: {
              attemptsLeft: 0
            }
          }
        });

        return;
    }
  }

  res.json({
    data: {
      token:
        result.token,

      expiresAt:
        result.expiresAt,

      customer:
        result.customer
    }
  });
}

export async function logoutAuthController(
  req: Request,
  res: Response
): Promise<void> {
  const authorization =
    req.headers.authorization;

  if (
    !req.customer
    || !authorization?.startsWith("Bearer ")
  ) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Требуется авторизация"
      }
    });
    return;
  }

  const token =
    authorization.substring(7);

  await revokeAuthSession(token);

  res.json({
    data: {
      success: true
    }
  });
}
