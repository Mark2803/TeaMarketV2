/**
 * Расчёт стоимости заказа: акции, промокод, реферальная скидка, списание бонусов.
 *
 * Сам расчёт не обращается к базе напрямую — все нужные данные он получает через
 * объект `db` (см. PricingDb). В работе сайта это база (pricing.service.ts),
 * в тестах — заранее подготовленные данные. Так расчёт денег можно проверить
 * автоматически, не трогая настоящую базу.
 */

export type PricingItem = {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  categoryIds: string[];
  collectionIds: string[];
};

export type DiscountLine = {
  sourceType: "promotion" | "promo_code" | "referral" | "loyalty";
  sourceId: string | null;
  code: string | null;
  name: string;
  amount: number;
  metadata?: Record<string, unknown>;
};

export type PricingResult = {
  grossItemsTotal: number;
  itemsTotal: number;
  deliveryCost: number;
  discountTotal: number;
  totalAmount: number;
  loyaltySpent: number;
  discounts: DiscountLine[];
};

// Денежные поля из базы приходят как Decimal; расчёт приводит их через Number().
type Money = unknown;

type ActiveWindow = { is_active: boolean; starts_at: Date | null; ends_at: Date | null };

export type PromotionRow = ActiveWindow & {
  id: string;
  name: string;
  discount_type: string;
  scope: string;
  target_ids: unknown;
  value: Money;
  buy_quantity: number | null;
  get_quantity: number | null;
  min_order_amount: Money;
  audience_type: string;
  customer_ids: unknown;
  activation_type: string;
  promo_code_id: string | null;
  is_stackable: boolean;
  usage_limit: number | null;
  per_customer_limit: number;
};

export type PromoCodeRow = ActiveWindow & {
  id: string;
  code: string;
  name: string;
  discount_type: string;
  value: Money;
  min_order_amount: Money;
  usage_limit: number | null;
  used_count: number;
  per_customer_limit: number;
};

export type ReferralSettingsRow = { is_active: boolean; invitee_discount_percent: Money; min_order_amount: Money };
export type ReferralCodeRow = { customer_id: string };
export type ReferralPartnerRow = {
  id: string;
  name: string;
  is_active: boolean;
  invitee_discount_percent: Money;
  commission_percent: Money;
  min_order_amount: Money;
};
export type LoyaltySettingsRow = {
  is_active: boolean;
  max_spend_percent: Money;
  min_spend_points: Money;
  allow_with_promotions: boolean;
  allow_with_promo_codes: boolean;
};
export type LoyaltyAccountRow = { balance: Money };

/** Данные, которые нужны расчёту. */
export type PricingDb = {
  /** Все акции, по убыванию приоритета. */
  promotions(): Promise<PromotionRow[]>;
  promoCodeById(id: string): Promise<PromoCodeRow | null>;
  promoCodeByCode(code: string): Promise<PromoCodeRow | null>;
  /** Сколько раз скидка применялась в неотменённых заказах (всего или у одного покупателя). */
  countDiscountUses(sourceType: "promotion" | "promo_code", sourceId: string, customerId?: string): Promise<number>;
  referralSettings(): Promise<ReferralSettingsRow | null>;
  referralCode(code: string): Promise<ReferralCodeRow | null>;
  referralPartner(code: string): Promise<ReferralPartnerRow | null>;
  /** Сколько неотменённых заказов у покупателя. */
  customerOrderCount(customerId: string): Promise<number>;
  loyaltySettings(): Promise<LoyaltySettingsRow | null>;
  loyaltyAccount(customerId: string): Promise<LoyaltyAccountRow | null>;
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function activeWindow(x: ActiveWindow, now: Date) {
  return x.is_active && (!x.starts_at || x.starts_at <= now) && (!x.ends_at || x.ends_at >= now);
}

function targets(x: unknown) {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : [];
}

export async function calculatePricingWith(
  db: PricingDb,
  items: PricingItem[],
  deliveryCost: number,
  promoCode?: string | null,
  referralCode?: string | null,
  loyaltyToSpend = 0,
  customerId?: string | null,
  now: Date = new Date()
): Promise<PricingResult> {
  const gross = round(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  let itemsAfter = gross;
  let delivery = deliveryCost;
  const discounts: DiscountLine[] = [];

  // 1. Акции (по приоритету; нестакающаяся акция останавливает перебор).
  const promotions = (await db.promotions()).filter(x => activeWindow(x, now) && gross >= Number(x.min_order_amount));
  for (const p of promotions) {
    const customerIds = targets(p.customer_ids);
    const audienceOk =
      p.audience_type === "all" ||
      (p.audience_type === "registered" && !!customerId) ||
      (p.audience_type === "guests" && !customerId) ||
      (p.audience_type === "customers" && !!customerId && customerIds.includes(customerId));
    if (!audienceOk) continue;

    if (p.activation_type === "promo_code") {
      if (!promoCode || !p.promo_code_id) continue;
      const activating = await db.promoCodeById(p.promo_code_id);
      if (!activating || activating.code !== promoCode.trim().toUpperCase()) continue;
    }
    if (p.usage_limit) {
      const used = await db.countDiscountUses("promotion", p.id);
      if (used >= p.usage_limit) continue;
    }
    if (customerId && p.per_customer_limit) {
      const usedByCustomer = await db.countDiscountUses("promotion", p.id, customerId);
      if (usedByCustomer >= p.per_customer_limit) continue;
    }

    const ids = targets(p.target_ids);
    const matches = (i: PricingItem) =>
      p.scope === "product" ? ids.includes(i.productId) :
      p.scope === "category" ? i.categoryIds.some(v => ids.includes(v)) :
      i.collectionIds.some(v => ids.includes(v));

    let eligible = 0;
    if (p.scope === "order") eligible = itemsAfter;
    else for (const i of items) if (matches(i)) eligible += i.unitPrice * i.quantity;
    if (eligible <= 0) continue;

    let amount = 0;
    if (p.discount_type === "percent") amount = eligible * Number(p.value) / 100;
    else if (p.discount_type === "fixed") amount = Math.min(eligible, Number(p.value));
    else if (p.discount_type === "free_delivery") amount = delivery;
    else if (p.discount_type === "buy_x_get_y" && p.scope !== "order") {
      const buy = p.buy_quantity ?? 1;
      const get = p.get_quantity ?? 1;
      for (const i of items) {
        if (matches(i)) amount += Math.floor(i.quantity / (buy + get)) * get * i.unitPrice;
      }
    }
    amount = round(Math.min(amount, p.discount_type === "free_delivery" ? delivery : itemsAfter));
    if (amount > 0) {
      if (p.discount_type === "free_delivery") delivery = round(delivery - amount);
      else itemsAfter = round(itemsAfter - amount);
      discounts.push({
        sourceType: "promotion", sourceId: p.id, code: null, name: p.name, amount,
        metadata: { scope: p.scope, type: p.discount_type, audience: p.audience_type }
      });
      if (!p.is_stackable) break;
    }
  }

  // 2. Промокод.
  if (promoCode) {
    const code = promoCode.trim().toUpperCase();
    const p = await db.promoCodeByCode(code);
    let customerUses = 0;
    if (p && customerId) customerUses = await db.countDiscountUses("promo_code", p.id, customerId);
    const withinCustomerLimit = !p || !customerId || customerUses < p.per_customer_limit;
    if (p && activeWindow(p, now) && gross >= Number(p.min_order_amount) &&
      (!p.usage_limit || p.used_count < p.usage_limit) && withinCustomerLimit) {
      let amount =
        p.discount_type === "percent" ? itemsAfter * Number(p.value) / 100 :
        p.discount_type === "fixed" ? Math.min(itemsAfter, Number(p.value)) :
        delivery;
      amount = round(amount);
      if (amount > 0) {
        if (p.discount_type === "free_delivery") delivery = round(delivery - amount);
        else itemsAfter = round(itemsAfter - amount);
        discounts.push({ sourceType: "promo_code", sourceId: p.id, code: p.code, name: p.name, amount });
      }
    }
  }

  // 3. Реферальная или партнёрская скидка — только на первый заказ вошедшего покупателя.
  if (referralCode && customerId) {
    const code = referralCode.trim().toUpperCase();
    const [settings, ref, partner, previousOrders] = await Promise.all([
      db.referralSettings(), db.referralCode(code), db.referralPartner(code), db.customerOrderCount(customerId)
    ]);
    if (previousOrders === 0) {
      if (settings?.is_active && ref && ref.customer_id !== customerId && gross >= Number(settings.min_order_amount)) {
        const amount = round(itemsAfter * Number(settings.invitee_discount_percent) / 100);
        if (amount > 0) {
          itemsAfter = round(itemsAfter - amount);
          discounts.push({ sourceType: "referral", sourceId: null, code, name: "Реферальная скидка", amount, metadata: { kind: "customer" } });
        }
      } else if (partner?.is_active && gross >= Number(partner.min_order_amount)) {
        const amount = round(itemsAfter * Number(partner.invitee_discount_percent) / 100);
        if (amount > 0) {
          itemsAfter = round(itemsAfter - amount);
          discounts.push({
            sourceType: "referral", sourceId: partner.id, code, name: `Партнёрская скидка: ${partner.name}`, amount,
            metadata: { kind: "partner", commissionPercent: Number(partner.commission_percent) }
          });
        }
      }
    }
  }

  // 4. Списание бонусов.
  let loyaltySpent = 0;
  if (customerId && loyaltyToSpend > 0) {
    const [settings, account] = await Promise.all([db.loyaltySettings(), db.loyaltyAccount(customerId)]);
    if (settings?.is_active && account && loyaltyToSpend >= Number(settings.min_spend_points)) {
      const hasPromotion = discounts.some(x => x.sourceType === "promotion");
      const hasPromo = discounts.some(x => x.sourceType === "promo_code");
      if ((settings.allow_with_promotions || !hasPromotion) && (settings.allow_with_promo_codes || !hasPromo)) {
        const cap = itemsAfter * Number(settings.max_spend_percent) / 100;
        loyaltySpent = round(Math.min(loyaltyToSpend, Number(account.balance), cap, itemsAfter));
        if (loyaltySpent > 0) {
          itemsAfter = round(itemsAfter - loyaltySpent);
          discounts.push({ sourceType: "loyalty", sourceId: null, code: null, name: "Списание бонусов", amount: loyaltySpent });
        }
      }
    }
  }

  const discountTotal = round(gross + deliveryCost - (itemsAfter + delivery));
  return {
    grossItemsTotal: gross,
    itemsTotal: itemsAfter,
    deliveryCost: delivery,
    discountTotal,
    totalAmount: round(itemsAfter + delivery),
    loyaltySpent,
    discounts
  };
}
