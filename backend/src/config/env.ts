import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL не задана")
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Ошибка переменных окружения:",
    result.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = result.data;