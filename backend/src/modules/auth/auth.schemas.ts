import { z } from "zod";

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export const phoneSchema = z.string().trim().transform(normalizePhone).refine(
  (phone) => /^\+?\d{10,15}$/.test(phone),
  { message: "Некорректный номер телефона" }
);

export const emailSchema = z.string().trim().toLowerCase().email("Некорректный email").max(320);

const authIdentitySchema = z.union([
  z.object({ email: emailSchema, phone: z.never().optional() }).transform(({ email }) => ({ channel: "email" as const, email })),
  z.object({ phone: phoneSchema, email: z.never().optional() }).transform(({ phone }) => ({ channel: "phone" as const, phone }))
]);

export const requestAuthCodeSchema = authIdentitySchema;
export const verifyAuthCodeSchema = z.union([
  z.object({ email: emailSchema, phone: z.never().optional(), code: z.string().trim().regex(/^\d{6}$/, "Код должен состоять из 6 цифр") })
    .transform(({ email, code }) => ({ channel: "email" as const, email, code })),
  z.object({ phone: phoneSchema, email: z.never().optional(), code: z.string().trim().regex(/^\d{6}$/, "Код должен состоять из 6 цифр") })
    .transform(({ phone, code }) => ({ channel: "phone" as const, phone, code }))
]);

export const sessionTokenSchema = z.string().trim().min(32, "Некорректный токен сессии").max(512, "Некорректный токен сессии");
export type RequestAuthCodeInput = z.infer<typeof requestAuthCodeSchema>;
export type VerifyAuthCodeInput = z.infer<typeof verifyAuthCodeSchema>;
