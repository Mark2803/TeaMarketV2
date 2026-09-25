import { z } from "zod";

/**
 * Допустимые статусы заказа из ограничения orders_status_check.
 */
export const orderStatusSchema =
  z.enum([
    "new",
    "confirmed",
    "processing",
    "shipped",
    "completed",
    "cancelled"
  ]);

/**
 * Проверяет номер заказа в маршруте модератора.
 */
export const moderatorOrderParamsSchema =
  z.object({
    orderNumber:
      z.string()
        .trim()
        .min(
          1,
          "Номер заказа не указан"
        )
        .max(
          64,
          "Некорректный номер заказа"
        )
  });

/**
 * Проверяет данные изменения статуса заказа.
 */
export const updateOrderStatusSchema =
  z.object({
    status:
      orderStatusSchema,

    cancellationReason:
      z.string()
        .trim()
        .min(2, "Укажите причину отмены")
        .max(1000, "Причина отмены слишком длинная")
        .nullable()
        .optional()
  })
  .superRefine((value, ctx) => {
    if (
      value.status === "cancelled"
      && !value.cancellationReason
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancellationReason"],
        message: "Для отмены заказа укажите причину"
      });
    }
  });

export const updateOrderArchiveSchema =
  z.object({
    archived:
      z.boolean()
  });

export type OrderStatus =
  z.infer<
    typeof orderStatusSchema
  >;

export type UpdateOrderStatusInput =
  z.infer<
    typeof updateOrderStatusSchema
  >;