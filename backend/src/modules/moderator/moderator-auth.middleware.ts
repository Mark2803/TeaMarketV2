import type {
  NextFunction,
  Request,
  Response
} from "express";

/**
 * Защищает маршруты единого модератора
 * ключом из переменной MODERATOR_API_KEY.
 */
export function moderatorAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const configuredKey =
    process.env.MODERATOR_API_KEY;

  if (!configuredKey) {
    res.status(503).json({
      error: {
        code:
          "MODERATOR_AUTH_NOT_CONFIGURED",

        message:
          "Доступ модератора не настроен"
      }
    });

    return;
  }

  const headerValue =
    req.headers["x-moderator-key"];

  const providedKey =
    Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

  if (
    !providedKey ||
    providedKey !== configuredKey
  ) {
    res.status(401).json({
      error: {
        code:
          "MODERATOR_UNAUTHORIZED",

        message:
          "Неверный ключ доступа модератора"
      }
    });

    return;
  }

  next();
}