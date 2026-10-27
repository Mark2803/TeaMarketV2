import { prepareOzonCheckoutDraft } from "./ozon-checkout.js";

/** Convert persisted order amounts (Prisma Decimal or decimal strings) to integer kopecks. */
export function rublesToKopecks(value: unknown): number {
  const text = String(value);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error("Invalid persisted monetary amount");
  const amount = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2,"0"));
  if (!Number.isSafeInteger(amount)) throw new Error("Amount overflow");
  return amount;
}

export interface PersistedOrderForOzon {
  order_number: string;
  total_amount: unknown;
  items_total: unknown;
  delivery_cost: unknown;
  order_items: Array<{ product_name: string; quantity: number; unit_price: unknown }>;
}

/** Offline checkout draft. No real Ozon checkout URL or transaction is created. */
export function previewPersistedOrder(order: PersistedOrderForOzon) {
  const items = order.order_items.map(item => ({
    name: item.product_name,
    quantity: item.quantity,
    unitPriceKopecks: rublesToKopecks(item.unit_price)
  }));
  const draft = prepareOzonCheckoutDraft({
    orderNumber: order.order_number,
    items,
    deliveryKopecks: rublesToKopecks(order.delivery_cost),
    deliveryEnabled: true
  });
  const total = rublesToKopecks(order.total_amount);
  const itemsTotal = rublesToKopecks(order.items_total);
  // Existing discounts/loyalty pricing can differ from order_items line totals.
  // Never send a mismatched draft to a payment gateway.
  const matchesPersistedAmounts = draft.payableKopecks === total && draft.itemsTotalKopecks === itemsTotal;
  return {
    provider: "ozon_pay_checkout" as const,
    mode: "preview" as const,
    paymentCreated: false,
    checkoutUrl: null,
    paymentConfirmed: false,
    matchesPersistedAmounts,
    blockers: [
      ...(!matchesPersistedAmounts ? ["ITEM_DISCOUNTS_REQUIRE_ALLOCATION"] : []),
      ...(draft.missingVat ? ["FISCAL_VAT_NOT_CONFIGURED"] : []),
      ...(draft.missingSellerIdentifiers ? ["OZON_SELLER_IDENTIFIERS_MISSING"] : []),
      "LIVE_PAYMENT_NOT_ENABLED"
    ],
    draft
  };
}
