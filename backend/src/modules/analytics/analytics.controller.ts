import type { Request, Response } from "express";
import { prisma } from "../../database/prisma.js";
import { analyticsEventSchema } from "./analytics.schemas.js";

export async function trackAnalyticsEventController(req: Request, res: Response): Promise<void> {
  const parsed = analyticsEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_ANALYTICS_EVENT", message: "Некорректное событие аналитики", details: parsed.error.flatten() } });
    return;
  }

  const value = parsed.data;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.analytics_sessions.upsert({
      where: { id: value.sessionId },
      create: {
        id: value.sessionId,
        visitor_id: value.visitorId,
        customer_id: req.customer?.id ?? null,
        started_at: now,
        last_activity_at: now,
        landing_path: value.session.landingPath,
        referrer: value.session.referrer ?? null,
        source: value.session.source,
        medium: value.session.medium ?? null,
        campaign: value.session.campaign ?? null,
        content: value.session.content ?? null,
        term: value.session.term ?? null,
        device_type: value.session.deviceType ?? null
      },
      update: {
        last_activity_at: now,
        ...(req.customer?.id ? { customer_id: req.customer.id } : {})
      }
    });

    await tx.analytics_events.create({
      data: {
        session_id: value.sessionId,
        visitor_id: value.visitorId,
        customer_id: req.customer?.id ?? null,
        event_type: value.eventType,
        product_id: value.productId ?? null,
        variant_id: value.variantId ?? null,
        quantity: value.quantity ?? null,
        path: value.path ?? null
      }
    });
  });

  res.status(202).json({ data: { accepted: true } });
}
