import { z } from "zod";

export const moderatorCustomerParamsSchema = z.object({ customerId: z.string().uuid() });

export const updateModeratorCustomerSchema = z.object({
  name: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().email().max(320).nullable().optional(),
  username: z.string().trim().max(100).nullable().optional(),
  birthDate: z.coerce.date().nullable().optional()
}).refine(v => Object.keys(v).length > 0, { message: "Нет данных для обновления" });
