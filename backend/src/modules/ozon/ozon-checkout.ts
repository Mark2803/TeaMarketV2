/**
 * TeaMarketV2 -> Ozon Pay Checkout preparation layer.
 * Intentionally offline: no API calls, no fabricated checkout URLs, no payment confirmation.
 * Seller SKU/extId mapping is deliberately absent until catalog linkage is approved.
 */
export type OzonMode = 'disabled' | 'preview' | 'live';

export interface CheckoutLine {
  name: string;
  quantity: number;
  /** Amount in minor currency units (kopecks), never floating-point rubles. */
  unitPriceKopecks: number;
  /** Actual fiscal VAT category must come from configured taxation data. */
  vat?: string | undefined;
  /** Ozon Seller identifier, NOT TeaMarket's internal SKU. */
  sellerSku?: string | undefined;
  sellerExtId?: string | undefined;
}

export interface CheckoutDraft {
  orderNumber: string;
  currency: 'RUB';
  items: CheckoutLine[];
  itemsTotalKopecks: number;
  deliveryKopecks: number;
  payableKopecks: number;
  deliveryEnabled: boolean;
  missingSellerIdentifiers: number;
  missingVat: number;
  readyForLive: boolean;
}

function assertKopecks(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer in kopecks`);
  }
}

/** Offline preview of the full basket; no assumption that Ozon's widget is embedded. */
export function prepareOzonCheckoutDraft(input: {
  orderNumber: string;
  items: CheckoutLine[];
  deliveryKopecks: number;
  deliveryEnabled?: boolean | undefined;
}): CheckoutDraft {
  if (!input.orderNumber.trim() || !input.items.length) {
    throw new Error('Order number and at least one item are required');
  }
  assertKopecks(input.deliveryKopecks, 'deliveryKopecks');
  let itemsTotalKopecks = 0;
  for (const item of input.items) {
    if (!item.name.trim() || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Every line requires a name and positive integer quantity');
    }
    assertKopecks(item.unitPriceKopecks, 'unitPriceKopecks');
    const line = item.unitPriceKopecks * item.quantity;
    if (!Number.isSafeInteger(line)) throw new Error('Line amount overflow');
    itemsTotalKopecks += line;
    if (!Number.isSafeInteger(itemsTotalKopecks)) throw new Error('Order amount overflow');
  }
  const payableKopecks = itemsTotalKopecks + input.deliveryKopecks;
  if (!Number.isSafeInteger(payableKopecks)) throw new Error('Total amount overflow');
  const deliveryEnabled = input.deliveryEnabled ?? true;
  const missingSellerIdentifiers = input.items.filter(x => !x.sellerSku && !x.sellerExtId).length;
  const missingVat = input.items.filter(x => !x.vat).length;
  return {
    orderNumber: input.orderNumber,
    currency: 'RUB',
    items: input.items.map(x => ({ ...x })),
    itemsTotalKopecks,
    deliveryKopecks: input.deliveryKopecks,
    payableKopecks,
    deliveryEnabled,
    missingSellerIdentifiers,
    missingVat,
    readyForLive: missingVat === 0 && (!deliveryEnabled || missingSellerIdentifiers === 0)
  };
}

export function ozonIntegrationMode(env: NodeJS.ProcessEnv = process.env): OzonMode {
  const mode = env.OZON_INTEGRATION_MODE ?? 'disabled';
  if (mode !== 'disabled' && mode !== 'preview' && mode !== 'live') {
    throw new Error('Invalid OZON_INTEGRATION_MODE');
  }
  return mode;
}
