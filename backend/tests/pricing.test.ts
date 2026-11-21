// Тесты расчёта стоимости заказа. Настоящая база не используется:
// акции, промокоды и бонусы задаются прямо в тесте.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculatePricingWith,
  type PricingDb,
  type PricingItem,
  type PromoCodeRow,
  type PromotionRow
} from "../src/modules/pricing/pricing-calculator.js";

const NOW = new Date("2026-11-21T12:00:00Z");
const CUSTOMER = "customer-1";

function promotion(over: Partial<PromotionRow>): PromotionRow {
  return {
    id: "promo-action", name: "Акция", is_active: true, starts_at: null, ends_at: null,
    discount_type: "percent", scope: "order", target_ids: null, value: 10,
    buy_quantity: null, get_quantity: null, min_order_amount: 0, audience_type: "all",
    customer_ids: null, activation_type: "automatic", promo_code_id: null,
    is_stackable: false, usage_limit: null, per_customer_limit: 1, ...over
  };
}

function promoCode(over: Partial<PromoCodeRow>): PromoCodeRow {
  return {
    id: "code-1", code: "CHAI10", name: "Промокод", is_active: true, starts_at: null, ends_at: null,
    discount_type: "percent", value: 10, min_order_amount: 0, usage_limit: null,
    used_count: 0, per_customer_limit: 1, ...over
  };
}

type FakeData = {
  promotions?: PromotionRow[];
  promoCodes?: PromoCodeRow[];
  uses?: number;
  customerUses?: number;
  orders?: number;
  loyalty?: { balance: number; maxPercent?: number; minPoints?: number; withPromotions?: boolean; withPromoCodes?: boolean };
  referral?: { percent: number; inviter: string; minOrder?: number };
};

function fakeDb(data: FakeData = {}): PricingDb {
  const codes = data.promoCodes ?? [];
  return {
    promotions: async () => data.promotions ?? [],
    promoCodeById: async id => codes.find(c => c.id === id) ?? null,
    promoCodeByCode: async code => codes.find(c => c.code === code) ?? null,
    countDiscountUses: async (_type, _id, customerId) => customerId ? data.customerUses ?? 0 : data.uses ?? 0,
    referralSettings: async () => data.referral
      ? { is_active: true, invitee_discount_percent: data.referral.percent, min_order_amount: data.referral.minOrder ?? 0 }
      : null,
    referralCode: async () => data.referral ? { customer_id: data.referral.inviter } : null,
    referralPartner: async () => null,
    customerOrderCount: async () => data.orders ?? 0,
    loyaltySettings: async () => data.loyalty ? {
      is_active: true,
      max_spend_percent: data.loyalty.maxPercent ?? 30,
      min_spend_points: data.loyalty.minPoints ?? 0,
      allow_with_promotions: data.loyalty.withPromotions ?? true,
      allow_with_promo_codes: data.loyalty.withPromoCodes ?? true
    } : null,
    loyaltyAccount: async () => data.loyalty ? { balance: data.loyalty.balance } : null
  };
}

const item = (over: Partial<PricingItem> = {}): PricingItem => ({
  productId: "p1", variantId: "v1", quantity: 1, unitPrice: 1000, categoryIds: [], collectionIds: [], ...over
});

/** Общие правила, которые должны выполняться в любом расчёте. */
function assertConsistent(r: Awaited<ReturnType<typeof calculatePricingWith>>, deliveryCost: number) {
  const sum = r.discounts.reduce((s, d) => s + d.amount, 0);
  assert.equal(Math.round(sum * 100), Math.round(r.discountTotal * 100), "скидка = сумма строк скидок");
  assert.equal(Math.round((r.itemsTotal + r.deliveryCost) * 100), Math.round(r.totalAmount * 100), "итог = товары + доставка");
  assert.equal(Math.round((r.grossItemsTotal + deliveryCost - r.discountTotal) * 100), Math.round(r.totalAmount * 100));
  assert.ok(r.itemsTotal >= 0 && r.deliveryCost >= 0 && r.totalAmount >= 0, "суммы не отрицательные");
}

describe("расчёт стоимости заказа", () => {
  it("без скидок: товары × количество + доставка", async () => {
    const r = await calculatePricingWith(fakeDb(), [item({ quantity: 2, unitPrice: 450.5 }), item({ unitPrice: 99.99 })], 300, null, null, 0, null, NOW);
    assert.equal(r.grossItemsTotal, 1000.99);
    assert.equal(r.totalAmount, 1300.99);
    assert.equal(r.discountTotal, 0);
    assertConsistent(r, 300);
  });

  it("акция в процентах на весь заказ", async () => {
    const r = await calculatePricingWith(fakeDb({ promotions: [promotion({ value: 15 })] }), [item({ quantity: 2 })], 250, null, null, 0, null, NOW);
    assert.equal(r.itemsTotal, 1700);
    assert.equal(r.totalAmount, 1950);
    assertConsistent(r, 250);
  });

  it("фиксированная скидка не больше стоимости товаров", async () => {
    const r = await calculatePricingWith(fakeDb({ promotions: [promotion({ discount_type: "fixed", value: 5000 })] }), [item()], 200, null, null, 0, null, NOW);
    assert.equal(r.itemsTotal, 0);
    assert.equal(r.totalAmount, 200);
    assertConsistent(r, 200);
  });

  it("бесплатная доставка обнуляет только доставку", async () => {
    const r = await calculatePricingWith(fakeDb({ promotions: [promotion({ discount_type: "free_delivery" })] }), [item()], 349, null, null, 0, null, NOW);
    assert.equal(r.deliveryCost, 0);
    assert.equal(r.itemsTotal, 1000);
    assertConsistent(r, 349);
  });

  it("акция не действует ниже минимальной суммы, вне срока или выключенная", async () => {
    const promotions = [
      promotion({ id: "a", min_order_amount: 5000 }),
      promotion({ id: "b", ends_at: new Date("2026-11-01T00:00:00Z") }),
      promotion({ id: "c", starts_at: new Date("2026-12-01T00:00:00Z") }),
      promotion({ id: "d", is_active: false })
    ];
    const r = await calculatePricingWith(fakeDb({ promotions }), [item()], 0, null, null, 0, null, NOW);
    assert.equal(r.discounts.length, 0);
    assert.equal(r.totalAmount, 1000);
  });

  it("акция только на товар считается от этого товара", async () => {
    const promotions = [promotion({ scope: "product", target_ids: ["p2"], value: 50 })];
    const r = await calculatePricingWith(fakeDb({ promotions }), [item(), item({ productId: "p2", variantId: "v2", unitPrice: 400 })], 0, null, null, 0, null, NOW);
    assert.equal(r.discountTotal, 200);
    assertConsistent(r, 0);
  });

  it("«2+1»: каждый третий товар бесплатно", async () => {
    const promotions = [promotion({ discount_type: "buy_x_get_y", scope: "product", target_ids: ["p1"], buy_quantity: 2, get_quantity: 1 })];
    const r = await calculatePricingWith(fakeDb({ promotions }), [item({ quantity: 7, unitPrice: 300 })], 0, null, null, 0, null, NOW);
    assert.equal(r.discountTotal, 600); // 7 шт. → 2 бесплатно
    assertConsistent(r, 0);
  });

  it("нестакающаяся акция останавливает остальные, стакающаяся — нет", async () => {
    const two = (stackable: boolean) => [promotion({ id: "a", value: 10, is_stackable: stackable }), promotion({ id: "b", value: 10 })];
    const single = await calculatePricingWith(fakeDb({ promotions: two(false) }), [item()], 0, null, null, 0, null, NOW);
    assert.equal(single.discounts.length, 1);
    const both = await calculatePricingWith(fakeDb({ promotions: two(true) }), [item()], 0, null, null, 0, null, NOW);
    assert.equal(both.discounts.length, 2);
    assert.equal(both.itemsTotal, 810); // 1000 −10% = 900, ещё −10% = 810
    assertConsistent(both, 0);
  });

  it("акция для зарегистрированных не даётся гостю", async () => {
    const promotions = [promotion({ audience_type: "registered" })];
    const guest = await calculatePricingWith(fakeDb({ promotions }), [item()], 0, null, null, 0, null, NOW);
    assert.equal(guest.discounts.length, 0);
    const customer = await calculatePricingWith(fakeDb({ promotions }), [item()], 0, null, null, 0, CUSTOMER, NOW);
    assert.equal(customer.discounts.length, 1);
  });

  it("промокод: регистр и пробелы не важны", async () => {
    const r = await calculatePricingWith(fakeDb({ promoCodes: [promoCode({})] }), [item()], 300, "  chai10 ", null, 0, null, NOW);
    assert.equal(r.itemsTotal, 900);
    assert.equal(r.discounts[0]?.code, "CHAI10");
    assertConsistent(r, 300);
  });

  it("промокод не применяется, если исчерпан лимит, истёк срок или покупатель уже использовал", async () => {
    const exhausted = await calculatePricingWith(fakeDb({ promoCodes: [promoCode({ usage_limit: 5, used_count: 5 })] }), [item()], 0, "CHAI10", null, 0, null, NOW);
    assert.equal(exhausted.discounts.length, 0);
    const expired = await calculatePricingWith(fakeDb({ promoCodes: [promoCode({ ends_at: new Date("2026-01-01") })] }), [item()], 0, "CHAI10", null, 0, null, NOW);
    assert.equal(expired.discounts.length, 0);
    const reused = await calculatePricingWith(fakeDb({ promoCodes: [promoCode({})], customerUses: 1 }), [item()], 0, "CHAI10", null, 0, CUSTOMER, NOW);
    assert.equal(reused.discounts.length, 0);
    const unknown = await calculatePricingWith(fakeDb(), [item()], 0, "NOPE", null, 0, null, NOW);
    assert.equal(unknown.totalAmount, 1000);
  });

  it("акция + промокод: промокод считается от суммы после акции", async () => {
    const r = await calculatePricingWith(fakeDb({ promotions: [promotion({ value: 10 })], promoCodes: [promoCode({ value: 10 })] }), [item()], 0, "CHAI10", null, 0, null, NOW);
    assert.equal(r.itemsTotal, 810);
    assertConsistent(r, 0);
  });

  it("бонусы: не больше баланса и не больше разрешённого процента", async () => {
    const byPercent = await calculatePricingWith(fakeDb({ loyalty: { balance: 10_000, maxPercent: 30 } }), [item()], 200, null, null, 5000, CUSTOMER, NOW);
    assert.equal(byPercent.loyaltySpent, 300);
    assert.equal(byPercent.totalAmount, 900);
    assertConsistent(byPercent, 200);
    const byBalance = await calculatePricingWith(fakeDb({ loyalty: { balance: 120, maxPercent: 30 } }), [item()], 0, null, null, 5000, CUSTOMER, NOW);
    assert.equal(byBalance.loyaltySpent, 120);
  });

  it("бонусы: гость не может списать, запрет вместе с промокодом соблюдается", async () => {
    const guest = await calculatePricingWith(fakeDb({ loyalty: { balance: 500 } }), [item()], 0, null, null, 500, null, NOW);
    assert.equal(guest.loyaltySpent, 0);
    const blocked = await calculatePricingWith(
      fakeDb({ loyalty: { balance: 500, withPromoCodes: false }, promoCodes: [promoCode({})] }),
      [item()], 0, "CHAI10", null, 200, CUSTOMER, NOW
    );
    assert.equal(blocked.loyaltySpent, 0);
    assert.equal(blocked.discounts.length, 1);
  });

  it("реферальная скидка — только на первый заказ и не по своему коду", async () => {
    const referral = { percent: 10, inviter: "someone-else" };
    const first = await calculatePricingWith(fakeDb({ referral }), [item()], 0, null, "FRIEND", 0, CUSTOMER, NOW);
    assert.equal(first.itemsTotal, 900);
    const second = await calculatePricingWith(fakeDb({ referral, orders: 1 }), [item()], 0, null, "FRIEND", 0, CUSTOMER, NOW);
    assert.equal(second.discounts.length, 0);
    const own = await calculatePricingWith(fakeDb({ referral: { percent: 10, inviter: CUSTOMER } }), [item()], 0, null, "FRIEND", 0, CUSTOMER, NOW);
    assert.equal(own.discounts.length, 0);
  });

  it("копейки: всё сходится при «неудобных» суммах и всех скидках сразу", async () => {
    const db = fakeDb({
      promotions: [promotion({ value: 7, is_stackable: true }), promotion({ id: "fd", discount_type: "free_delivery" })],
      promoCodes: [promoCode({ value: 13 })],
      loyalty: { balance: 77.77, maxPercent: 50 }
    });
    const items = [item({ quantity: 3, unitPrice: 333.33 }), item({ productId: "p2", variantId: "v2", quantity: 1, unitPrice: 0.01 })];
    const r = await calculatePricingWith(db, items, 412.37, "CHAI10", null, 1000, CUSTOMER, NOW);
    assert.equal(r.deliveryCost, 0);
    assertConsistent(r, 412.37);
    for (const d of r.discounts) assert.equal(Math.round(d.amount * 100) / 100, d.amount, "скидка в целых копейках");
  });
});
