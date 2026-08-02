import { z } from "zod";

import {
  orderStatusSchema
} from "./moderator-order.schemas.js";

/**
 * Параметры списка заказов модератора.
 */
export const moderatorOrdersQuerySchema =
  z.object({
    page:
      z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),

    status:
      orderStatusSchema
        .optional(),

    search:
      z.string()
        .trim()
        .min(1)
        .max(255)
        .optional()
  });

export type ModeratorOrdersQuery =
  z.infer<
    typeof moderatorOrdersQuerySchema
  >;