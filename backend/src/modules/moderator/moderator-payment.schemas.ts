import { z } from "zod";

/**
 * Допустимые статусы операции оплаты.
 */
export const paymentOperationStatusSchema =
  z.enum([
    "pending",
    "succeeded",
    "failed",
    "cancelled",
    "refunded"
  ]);

/**
 * Данные обновления оплаты заказа.
 */
export const updatePaymentSchema =
  z.object({
    status:
      paymentOperationStatusSchema,

    operationNumber:
      z.string()
        .trim()
        .max(
          255,
          "Номер операции слишком длинный"
        )
        .nullable()
        .optional(),

    paidAt:
      z.coerce
        .date()
        .nullable()
        .optional()
  });

export type UpdatePaymentInput =
  z.infer<
    typeof updatePaymentSchema
  >;