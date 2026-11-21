import type { ErrorRequestHandler } from "express";

/** Ошибка с HTTP-статусом и кодом, безопасными для показа клиенту. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function clientErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 ? status : null;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    if (error.status >= 500) console.error(error);
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof Error && error.name === "MulterError") {
    const tooLarge = (error as { code?: string }).code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
        message: tooLarge ? "Файл слишком большой (максимум 10 МБ)" : "Некорректная загрузка файла"
      }
    });
    return;
  }

  // Ошибки клиента от express.json(), multer и других middleware
  // (битый JSON, слишком большой файл) — это 4xx, а не сбой сервера.
  const status = clientErrorStatus(error);
  if (status !== null) {
    res.status(status).json({
      error: {
        code: status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
        message: status === 413 ? "Слишком большой запрос" : "Некорректный запрос"
      }
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Внутренняя ошибка сервера"
    }
  });
};
