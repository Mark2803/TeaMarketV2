import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../database/prisma.js";
import {
  promotionInputSchema,
  promotionUpdateSchema,
  promoCodeInputSchema,
  promoCodeUpdateSchema,
  loyaltySettingsSchema,
  referralSettingsSchema,
  referralPartnerSchema,
  referralPartnerUpdateSchema,
} from "./moderator-promotions.schemas.js";

const id = (req: Request) => String(req.params.id ?? "");

function sendDbError(res: Response, error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ error: { message: "Такое значение уже используется" } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    res.status(404).json({ error: { message: "Запись не найдена" } });
    return;
  }
  res.status(500).json({ error: { message: fallback } });
}

const promotionData = (x: Record<string, any>) => ({
  ...(x.name !== undefined ? { name: x.name } : {}),
  ...(x.description !== undefined ? { description: x.description ?? null } : {}),
  ...(x.discountType !== undefined ? { discount_type: x.discountType } : {}),
  ...(x.scope !== undefined ? { scope: x.scope } : {}),
  ...(x.targetIds !== undefined ? { target_ids: x.targetIds } : {}),
  ...(x.value !== undefined ? { value: x.value } : {}),
  ...(x.buyQuantity !== undefined ? { buy_quantity: x.buyQuantity ?? null } : {}),
  ...(x.getQuantity !== undefined ? { get_quantity: x.getQuantity ?? null } : {}),
  ...(x.minOrderAmount !== undefined ? { min_order_amount: x.minOrderAmount } : {}),
  ...(x.priority !== undefined ? { priority: x.priority } : {}),
  ...(x.audienceType !== undefined ? { audience_type: x.audienceType } : {}),
  ...(x.customerIds !== undefined ? { customer_ids: x.customerIds } : {}),
  ...(x.activationType !== undefined ? { activation_type: x.activationType } : {}),
  ...(x.promoCodeId !== undefined ? { promo_code_id: x.promoCodeId ?? null } : {}),
  ...(x.isStackable !== undefined ? { is_stackable: x.isStackable } : {}),
  ...(x.usageLimit !== undefined ? { usage_limit: x.usageLimit ?? null } : {}),
  ...(x.perCustomerLimit !== undefined ? { per_customer_limit: x.perCustomerLimit } : {}),
  ...(x.isActive !== undefined ? { is_active: x.isActive } : {}),
  ...(x.startsAt !== undefined ? { starts_at: x.startsAt ?? null } : {}),
  ...(x.endsAt !== undefined ? { ends_at: x.endsAt ?? null } : {}),
  updated_at: new Date(),
});

const promoCodeData = (x: Record<string, any>) => ({
  ...(x.code !== undefined ? { code: x.code } : {}),
  ...(x.name !== undefined ? { name: x.name } : {}),
  ...(x.discountType !== undefined ? { discount_type: x.discountType } : {}),
  ...(x.value !== undefined ? { value: x.value } : {}),
  ...(x.minOrderAmount !== undefined ? { min_order_amount: x.minOrderAmount } : {}),
  ...(x.usageLimit !== undefined ? { usage_limit: x.usageLimit ?? null } : {}),
  ...(x.perCustomerLimit !== undefined ? { per_customer_limit: x.perCustomerLimit } : {}),
  ...(x.isActive !== undefined ? { is_active: x.isActive } : {}),
  ...(x.startsAt !== undefined ? { starts_at: x.startsAt ?? null } : {}),
  ...(x.endsAt !== undefined ? { ends_at: x.endsAt ?? null } : {}),
  updated_at: new Date(),
});

export async function listPromotions(_req: Request, res: Response) {
  res.json({ data: await prisma.promotions.findMany({ orderBy: [{ priority: "desc" }, { created_at: "desc" }] }) });
}

export async function createPromotion(req: Request, res: Response) {
  const r = promotionInputSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: { message: "Некорректные данные акции", details: r.error.flatten() } });
    return;
  }
  try {
    res.status(201).json({ data: await prisma.promotions.create({ data: promotionData(r.data) as any }) });
  } catch (error) {
    sendDbError(res, error, "Не удалось создать акцию");
  }
}

export async function updatePromotion(req: Request, res: Response) {
  const r = promotionUpdateSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: { message: "Некорректные данные акции", details: r.error.flatten() } });
    return;
  }
  try {
    res.json({ data: await prisma.promotions.update({ where: { id: id(req) }, data: promotionData(r.data) as any }) });
  } catch (error) {
    sendDbError(res, error, "Не удалось изменить акцию");
  }
}

export async function deletePromotion(req: Request, res: Response) {
  try {
    await prisma.promotions.delete({ where: { id: id(req) } });
    res.status(204).end();
  } catch (error) {
    sendDbError(res, error, "Не удалось удалить акцию");
  }
}

export async function listPromoCodes(_req: Request, res: Response) {
  res.json({ data: await prisma.promo_codes.findMany({ orderBy: { created_at: "desc" } }) });
}

export async function createPromoCode(req: Request, res: Response) {
  const r = promoCodeInputSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: { message: "Некорректные данные промокода", details: r.error.flatten() } });
    return;
  }
  try {
    res.status(201).json({ data: await prisma.promo_codes.create({ data: promoCodeData(r.data) as any }) });
  } catch (error) {
    sendDbError(res, error, "Не удалось создать промокод");
  }
}

export async function updatePromoCode(req: Request, res: Response) {
  const r = promoCodeUpdateSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: { message: "Некорректные данные промокода", details: r.error.flatten() } });
    return;
  }
  try {
    res.json({ data: await prisma.promo_codes.update({ where: { id: id(req) }, data: promoCodeData(r.data) as any }) });
  } catch (error) {
    sendDbError(res, error, "Не удалось изменить промокод");
  }
}

export async function deletePromoCode(req: Request, res: Response) {
  try {
    await prisma.promo_codes.delete({ where: { id: id(req) } });
    res.status(204).end();
  } catch (error) {
    sendDbError(res, error, "Не удалось удалить промокод");
  }
}

export async function getBenefitSettings(_req: Request, res: Response) {
  const [loyalty, referral] = await Promise.all([
    prisma.loyalty_settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
    prisma.referral_settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
  ]);
  res.json({ data: { loyalty, referral } });
}

export async function updateLoyaltySettings(req: Request, res: Response) {
  const r = loyaltySettingsSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: { message: "Некорректные настройки лояльности", details: r.error.flatten() } });
    return;
  }
  const x = r.data;
  res.json({ data: await prisma.loyalty_settings.upsert({
    where: { id: 1 },
    create: { id: 1, is_active: x.isActive, earn_percent: x.earnPercent, max_spend_percent: x.maxSpendPercent, min_order_amount: x.minOrderAmount, bonus_lifetime_days: x.bonusLifetimeDays ?? null, min_spend_points: x.minSpendPoints, allow_with_promotions: x.allowWithPromotions, allow_with_promo_codes: x.allowWithPromoCodes },
    update: { is_active: x.isActive, earn_percent: x.earnPercent, max_spend_percent: x.maxSpendPercent, min_order_amount: x.minOrderAmount, bonus_lifetime_days: x.bonusLifetimeDays ?? null, min_spend_points: x.minSpendPoints, allow_with_promotions: x.allowWithPromotions, allow_with_promo_codes: x.allowWithPromoCodes, updated_at: new Date() },
  }) });
}

export async function updateReferralSettings(req: Request, res: Response) {
  const r = referralSettingsSchema.safeParse(req.body);
  if (!r.success) {
    res.status(400).json({ error: { message: "Некорректные настройки реферальной программы", details: r.error.flatten() } });
    return;
  }
  const x = r.data;
  res.json({ data: await prisma.referral_settings.upsert({
    where: { id: 1 },
    create: { id: 1, is_active: x.isActive, inviter_bonus: x.inviterBonus, invitee_discount_percent: x.inviteeDiscountPercent, min_order_amount: x.minOrderAmount },
    update: { is_active: x.isActive, inviter_bonus: x.inviterBonus, invitee_discount_percent: x.inviteeDiscountPercent, min_order_amount: x.minOrderAmount, updated_at: new Date() },
  }) });
}


export async function listReferralPartners(_req: Request, res: Response) {
  const rows = await prisma.referral_partners.findMany({ orderBy: { created_at: "desc" } });
  const data = await Promise.all(rows.map(async (partner) => {
    const orders = await prisma.referral_partner_orders.aggregate({
      where: { partner_id: partner.id },
      _count: { _all: true },
      _sum: { order_total: true, commission: true },
    });
    return {
      ...partner,
      order_count: orders._count._all,
      revenue: orders._sum.order_total ?? 0,
      commission_total: orders._sum.commission ?? 0,
    };
  }));
  res.json({ data });
}

export async function createReferralPartner(req: Request, res: Response) {
  const r = referralPartnerSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: { message: "Некорректные данные партнёра", details: r.error.flatten() } }); return; }
  try {
    const x = r.data;
    const data = await prisma.referral_partners.create({ data: {
      name: x.name, contact: x.contact ?? null, code: x.code,
      invitee_discount_percent: x.inviteeDiscountPercent,
      commission_percent: x.commissionPercent,
      min_order_amount: x.minOrderAmount, is_active: x.isActive,
    }});
    res.status(201).json({ data });
  } catch (error) { sendDbError(res, error, "Не удалось создать партнёра"); }
}

export async function updateReferralPartner(req: Request, res: Response) {
  const r = referralPartnerUpdateSchema.safeParse(req.body);
  if (!r.success) { res.status(400).json({ error: { message: "Некорректные данные партнёра", details: r.error.flatten() } }); return; }
  try {
    const x = r.data;
    const data = await prisma.referral_partners.update({ where: { id: id(req) }, data: {
      ...(x.name !== undefined ? { name: x.name } : {}),
      ...(x.contact !== undefined ? { contact: x.contact ?? null } : {}),
      ...(x.code !== undefined ? { code: x.code } : {}),
      ...(x.inviteeDiscountPercent !== undefined ? { invitee_discount_percent: x.inviteeDiscountPercent } : {}),
      ...(x.commissionPercent !== undefined ? { commission_percent: x.commissionPercent } : {}),
      ...(x.minOrderAmount !== undefined ? { min_order_amount: x.minOrderAmount } : {}),
      ...(x.isActive !== undefined ? { is_active: x.isActive } : {}),
      updated_at: new Date(),
    }});
    res.json({ data });
  } catch (error) { sendDbError(res, error, "Не удалось изменить партнёра"); }
}

export async function deleteReferralPartner(req: Request, res: Response) {
  try { await prisma.referral_partners.delete({ where: { id: id(req) } }); res.status(204).end(); }
  catch (error) { sendDbError(res, error, "Не удалось удалить партнёра"); }
}
