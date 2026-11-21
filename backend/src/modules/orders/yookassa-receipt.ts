/**
 * Чек для ЮKassa (54-ФЗ). Отдельный модуль без обращения к базе и сети,
 * чтобы его можно было проверить автоматическими тестами.
 *
 * Главное правило: сумма строк чека всегда равна сумме, которую платит покупатель.
 * Скидки распределяются по товарам в копейках пропорционально их стоимости.
 */

export type ReceiptItem = {
  description: string;
  quantity: string;
  amount: { value: string; currency: "RUB" };
  vat_code: 1;
  payment_mode: "full_payment";
  payment_subject: "commodity" | "service";
};

export function buildReceipt(order: {
  total_amount: unknown;
  delivery_cost: unknown;
  phone: string;
  email: string | null;
  order_items: Array<{ product_name: string; quantity: number; line_total: unknown }>;
}): { customer: { email?: string; phone?: string }; items: ReceiptItem[] } {
  const total = Math.round(Number(order.total_amount) * 100);
  const delivery = Math.round(Number(order.delivery_cost) * 100);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(delivery) || total <= 0 || delivery < 0 || delivery > total) {
    throw new Error("YOOKASSA_INVALID_ORDER_TOTAL");
  }
  const phone = order.phone.replace(/\D/g, "");
  const customer = order.email?.trim() ? { email: order.email.trim() } :
    phone.length === 11 && phone.startsWith("8") ? { phone: `7${phone.slice(1)}` } :
    phone.length === 11 && phone.startsWith("7") ? { phone } :
    phone.length === 10 ? { phone: `7${phone}` } : null;
  if (!customer) throw new Error("YOOKASSA_RECEIPT_CUSTOMER_MISSING");

  const productTotal = total - delivery;
  const lines = order.order_items.map(item => ({
    name: item.product_name,
    quantity: Number(item.quantity),
    original: Math.round(Number(item.line_total) * 100)
  }));
  if (!lines.length || lines.some(line => !Number.isSafeInteger(line.quantity) || line.quantity <= 0 ||
    !Number.isSafeInteger(line.original) || line.original < 0)) {
    throw new Error("YOOKASSA_INVALID_RECEIPT_ITEMS");
  }
  const originalTotal = lines.reduce((sum, line) => sum + line.original, 0);
  if (originalTotal <= 0 && productTotal > 0) throw new Error("YOOKASSA_INVALID_RECEIPT_ITEMS");

  // Distribute discounts in kopecks so the fiscal receipt always equals the charged amount.
  let remaining = productTotal;
  let remainingOriginal = originalTotal;
  const items: ReceiptItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const allocated = i === lines.length - 1 ? remaining :
      remainingOriginal > 0 ? Math.round(remaining * line.original / remainingOriginal) : 0;
    remaining -= allocated;
    remainingOriginal -= line.original;
    if (allocated <= 0) continue;
    // YooKassa receipt price is per unit; splitting into a single quantity-one line
    // preserves exact kopecks after discounts, including non-divisible quantities.
    items.push({
      description: line.name.slice(0, 128),
      quantity: "1",
      amount: { value: (allocated / 100).toFixed(2), currency: "RUB" },
      vat_code: 1,
      payment_mode: "full_payment",
      payment_subject: "commodity"
    });
  }
  if (delivery > 0) items.push({
    description: "Доставка заказа",
    quantity: "1",
    amount: { value: (delivery / 100).toFixed(2), currency: "RUB" },
    vat_code: 1,
    payment_mode: "full_payment",
    payment_subject: "service"
  });
  if (!items.length) throw new Error("YOOKASSA_EMPTY_RECEIPT");
  return { customer, items };
}
