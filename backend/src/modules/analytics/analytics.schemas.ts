import { z } from "zod";

export const analyticsEventSchema = z.object({
  sessionId: z.string().uuid(),
  visitorId: z.string().uuid(),
  eventType: z.enum(["page_view", "product_view", "add_to_cart", "checkout_started"]),
  productId: z.string().uuid().nullable().optional(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive().max(999).nullable().optional(),
  path: z.string().max(2000).nullable().optional(),
  session: z.object({
    landingPath: z.string().max(2000),
    referrer: z.string().max(4000).nullable().optional(),
    source: z.string().trim().min(1).max(100),
    medium: z.string().trim().max(100).nullable().optional(),
    campaign: z.string().trim().max(255).nullable().optional(),
    content: z.string().trim().max(255).nullable().optional(),
    term: z.string().trim().max(255).nullable().optional(),
    deviceType: z.enum(["mobile", "tablet", "desktop"]).nullable().optional()
  })
});
