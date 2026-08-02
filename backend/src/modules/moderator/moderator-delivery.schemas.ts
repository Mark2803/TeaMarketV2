import { z } from "zod";

/**
 * Допустимые статусы доставки.
 */
export const deliveryStatusSchema =
  z.enum([
    "pending",
    "preparing",
    "handed_over",
    "in_transit",
    "delivered",
    "returned",
    "cancelled"
  ]);

/**
 * Обновление доставки заказа.
 */
export const updateDeliverySchema =
  z.object({
    status:
      deliveryStatusSchema,

    deliveryService:
      z.string()
        .trim()
        .max(255)
        .nullable()
        .optional(),

    trackingNumber:
      z.string()
        .trim()
        .max(255)
        .nullable()
        .optional(),

    handedOverAt:
      z.coerce
        .date()
        .nullable()
        .optional(),

    receivedAt:
      z.coerce
        .date()
        .nullable()
        .optional()
  });

export type UpdateDeliveryInput =
  z.infer<
    typeof updateDeliverySchema
  >;