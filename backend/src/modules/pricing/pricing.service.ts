import { prisma } from "../../database/prisma.js";
import { calculatePricingWith, type PricingDb, type PricingItem } from "./pricing-calculator.js";

export type { DiscountLine, PricingItem, PricingResult } from "./pricing-calculator.js";

/** Данные для расчёта стоимости — из базы магазина. */
const pricingDb: PricingDb = {
  promotions: () => prisma.promotions.findMany({ orderBy: { priority: "desc" } }),
  promoCodeById: id => prisma.promo_codes.findUnique({ where: { id } }),
  promoCodeByCode: code => prisma.promo_codes.findUnique({ where: { code } }),
  countDiscountUses: (sourceType, sourceId, customerId) => prisma.order_discounts.count({
    where: {
      source_type: sourceType,
      source_id: sourceId,
      orders: customerId ? { customer_id: customerId, status: { not: "cancelled" } } : { status: { not: "cancelled" } }
    }
  }),
  referralSettings: () => prisma.referral_settings.findUnique({ where: { id: 1 } }),
  referralCode: code => prisma.referral_codes.findUnique({ where: { code } }),
  referralPartner: code => prisma.referral_partners.findUnique({ where: { code } }),
  customerOrderCount: customerId => prisma.orders.count({ where: { customer_id: customerId, status: { not: "cancelled" } } }),
  loyaltySettings: () => prisma.loyalty_settings.findUnique({ where: { id: 1 } }),
  loyaltyAccount: customerId => prisma.loyalty_accounts.findUnique({ where: { customer_id: customerId } })
};

export function calculatePricing(
  items: PricingItem[],
  deliveryCost: number,
  promoCode?: string | null,
  referralCode?: string | null,
  loyaltyToSpend = 0,
  customerId?: string | null
) {
  return calculatePricingWith(pricingDb, items, deliveryCost, promoCode, referralCode, loyaltyToSpend, customerId);
}
