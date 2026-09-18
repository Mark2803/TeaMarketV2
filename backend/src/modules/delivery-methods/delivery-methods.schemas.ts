import { z } from "zod";

export const deliveryQuoteSchema = z.object({
  deliveryMethodId: z.string().uuid("Некорректный способ доставки"),
  fullAddress: z.string().trim().min(5, "Укажите адрес доставки")
});

export type DeliveryQuoteInput = z.infer<typeof deliveryQuoteSchema>;
