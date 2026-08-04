import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const addressBodySchema = z.object({
  addressName: z.string().trim().min(1).max(100),
  recipientName: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(6).max(32),
  region: nullableText(150),
  city: z.string().trim().min(1).max(150),
  street: z.string().trim().min(1).max(255),
  house: z.string().trim().min(1).max(50),
  apartment: nullableText(50),
  postalCode: nullableText(20),
  comment: z.string().trim().max(2000).nullable().optional(),
  isDefault: z.boolean().optional()
});

export const updateAddressBodySchema = addressBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Не указаны данные для обновления" }
);

export type AddressBody = z.infer<typeof addressBodySchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressBodySchema>;
