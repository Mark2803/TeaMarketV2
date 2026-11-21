// Тесты чека ЮKassa: сумма строк чека всегда должна совпадать с суммой оплаты,
// иначе ЮKassa отклонит платёж или чек в налоговой разойдётся с оплатой.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReceipt } from "../src/modules/orders/yookassa-receipt.js";

type Line = { product_name: string; quantity: number; line_total: number };

function order(total: number, delivery: number, lines: Line[], contact: { email?: string | null; phone?: string } = {}) {
  return {
    total_amount: total,
    delivery_cost: delivery,
    phone: contact.phone ?? "+7 (999) 123-45-67",
    email: contact.email === undefined ? "buyer@example.com" : contact.email,
    order_items: lines
  };
}

const kopecks = (items: Array<{ amount: { value: string } }>) =>
  items.reduce((s, i) => s + Math.round(Number(i.amount.value) * 100), 0);

describe("чек ЮKassa", () => {
  it("без скидок: строки товаров + строка доставки", () => {
    const r = buildReceipt(order(1350, 350, [
      { product_name: "Габа медовая", quantity: 2, line_total: 700 },
      { product_name: "Да Хун Пао", quantity: 1, line_total: 300 }
    ]));
    assert.equal(r.items.length, 3);
    assert.equal(kopecks(r.items), 135000);
    const deliveryLine = r.items.at(-1)!;
    assert.equal(deliveryLine.description, "Доставка заказа");
    assert.equal(deliveryLine.payment_subject, "service");
    assert.equal(deliveryLine.amount.value, "350.00");
  });

  it("скидка распределяется по товарам до копейки", () => {
    // Товары на 1000 ₽, оплачено 666.67 ₽ за товары: делится «неровно».
    const r = buildReceipt(order(666.67, 0, [
      { product_name: "A", quantity: 1, line_total: 333.33 },
      { product_name: "B", quantity: 1, line_total: 333.33 },
      { product_name: "C", quantity: 1, line_total: 333.34 }
    ]));
    assert.equal(kopecks(r.items), 66667);
    for (const i of r.items) assert.match(i.amount.value, /^\d+\.\d{2}$/);
  });

  it("сумма чека совпадает с оплатой на сотне случайных заказов", () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let n = 0; n < 100; n++) {
      const lines: Line[] = Array.from({ length: 1 + Math.floor(rnd() * 6) }, (_, k) => {
        const quantity = 1 + Math.floor(rnd() * 5);
        return { product_name: `Чай ${k}`, quantity, line_total: Math.round(rnd() * 300000) / 100 * quantity };
      });
      const goods = lines.reduce((s, l) => s + Math.round(l.line_total * 100), 0);
      const paidGoods = Math.max(1, Math.floor(goods * (0.5 + rnd() / 2)));
      const delivery = Math.floor(rnd() * 60000);
      const total = (paidGoods + delivery) / 100;
      const r = buildReceipt(order(total, delivery / 100, lines));
      assert.equal(kopecks(r.items), paidGoods + delivery, `заказ №${n}`);
    }
  });

  it("покупатель: email, иначе телефон в формате 7XXXXXXXXXX", () => {
    const lines = [{ product_name: "A", quantity: 1, line_total: 100 }];
    assert.deepEqual(buildReceipt(order(100, 0, lines, { email: " a@b.ru " })).customer, { email: "a@b.ru" });
    assert.deepEqual(buildReceipt(order(100, 0, lines, { email: null, phone: "8 999 123-45-67" })).customer, { phone: "79991234567" });
    assert.deepEqual(buildReceipt(order(100, 0, lines, { email: null, phone: "9991234567" })).customer, { phone: "79991234567" });
    assert.throws(() => buildReceipt(order(100, 0, lines, { email: null, phone: "123" })), /RECEIPT_CUSTOMER_MISSING/);
  });

  it("ошибочные суммы не пропускаются", () => {
    const lines = [{ product_name: "A", quantity: 1, line_total: 100 }];
    assert.throws(() => buildReceipt(order(0, 0, lines)), /INVALID_ORDER_TOTAL/);
    assert.throws(() => buildReceipt(order(100, 200, lines)), /INVALID_ORDER_TOTAL/);
    assert.throws(() => buildReceipt(order(100, 0, [])), /INVALID_RECEIPT_ITEMS/);
    assert.throws(() => buildReceipt(order(100, 0, [{ product_name: "A", quantity: 0, line_total: 100 }])), /INVALID_RECEIPT_ITEMS/);
  });

  it("длинное название товара обрезается до 128 символов", () => {
    const r = buildReceipt(order(100, 0, [{ product_name: "Ч".repeat(300), quantity: 1, line_total: 100 }]));
    assert.equal(r.items[0]!.description.length, 128);
  });
});
