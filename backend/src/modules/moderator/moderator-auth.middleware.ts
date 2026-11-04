import type { NextFunction, Request, Response } from "express";
import { readAdminSession } from "./moderator-session.js";

/** Защищает административные маршруты серверной сессией. */
export async function moderatorAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (await readAdminSession(req)) {
    next();
    return;
  }

  res.status(401).json({
    error: {
      code: "MODERATOR_UNAUTHORIZED",
      message: "Требуется вход администратора"
    }
  });
}
