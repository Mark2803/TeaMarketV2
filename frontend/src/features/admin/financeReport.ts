import { getAdminFinanceReport, type AdminAnalyticsData } from "../../shared/api/admin";

// Dependency-free XLSX writer. Uses uncompressed ZIP entries, accepted by Excel.
type Cell = string | number;
const enc = new TextEncoder();
const xml = (v: Cell) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (n: number): string => n < 26 ? String.fromCharCode(65 + n) : col(Math.floor(n / 26) - 1) + String.fromCharCode(65 + n % 26);
function sheet(rows: Cell[][]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData>${rows.map((row, r) => `<row r="${r+1}">${row.map((v, c) => `<c r="${col(c)}${r+1}" ${typeof v === "number" && Number.isFinite(v) ? "" : 't="inlineStr"'}>${typeof v === "number" && Number.isFinite(v) ? `<v>${v}</v>` : `<is><t>${xml(v)}</t></is>`}</c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(bytes: Uint8Array) { let c = -1; for (const b of bytes) c = crcTable[(c ^ b) & 255]! ^ (c >>> 8); return (c ^ -1) >>> 0; }
function zip(files: { name: string; content: string }[]) {
  const local: Uint8Array[] = [], central: Uint8Array[] = []; let offset = 0;
  const write = (v: DataView, at: number, x: number, size: 2 | 4 = 2) => size === 2 ? v.setUint16(at, x, true) : v.setUint32(at, x, true);
  for (const file of files) {
    const name = enc.encode(file.name), data = enc.encode(file.content), crc = crc32(data);
    const head = new Uint8Array(30 + name.length); const h = new DataView(head.buffer);
    write(h, 0, 0x04034b50, 4); write(h, 4, 20); write(h, 14, crc, 4); write(h, 18, data.length, 4); write(h, 22, data.length, 4); write(h, 26, name.length); head.set(name, 30);
    local.push(head, data); const ch = new Uint8Array(46 + name.length); const v = new DataView(ch.buffer);
    write(v, 0, 0x02014b50, 4); write(v, 4, 20); write(v, 6, 20); write(v, 16, crc, 4); write(v, 20, data.length, 4); write(v, 24, data.length, 4); write(v, 28, name.length); write(v, 42, offset, 4); ch.set(name, 46); central.push(ch); offset += head.length + data.length;
  }
  const centralSize = central.reduce((s, x) => s + x.length, 0); const end = new Uint8Array(22); const e = new DataView(end.buffer);
  write(e, 0, 0x06054b50, 4); write(e, 8, files.length); write(e, 10, files.length); write(e, 12, centralSize, 4); write(e, 16, offset, 4);
  return new Blob([...local, ...central, end] as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
export async function downloadFinanceReport(data: AdminAnalyticsData) {
  const detail = (await getAdminFinanceReport(data.period.from.slice(0, 10), data.period.to.slice(0, 10))).data;
  const value = (v: string | number | null | undefined): Cell => v ?? "";
  const { from, to } = data.period;
  const sheets: { name: string; rows: Cell[][] }[] = [
    { name: "Итоги", rows: [["Финансовая аналитика магазина"], ["Период с", from, "по", to], ["Показатель", "Значение"], ["Выручка, ₽", data.overview.revenue], ["Заказы", data.overview.orders], ["Средний чек, ₽", data.overview.averageCheck], ["Посетители", data.overview.visitors], ["Конверсия, %", data.overview.orderConversion], ["Выкуп, %", data.overview.buyoutRate], ["Скидки, ₽", data.marketing.discountTotal], ["Выручка с акциями, ₽", data.marketing.marketingRevenue]] },
    { name: "По дням", rows: [["Дата", "Выручка, ₽", "Заказы", "Посетители"], ...data.dynamics.map(d => [d.date, d.revenue, d.orders, d.visitors])] },
    { name: "Источники", rows: [["Источник", "Посетители", "Добавления в корзину", "Заказы", "Конверсия, %", "Выручка, ₽"], ...data.sources.map(s => [s.source, s.visitors, s.cartSessions, s.orders, s.conversion, s.revenue])] },
    { name: "Товары", rows: [["Товар", "Просмотры", "Добавления в корзину", "Продано", "Конверсия, %", "Выручка, ₽"], ...data.products.map(p => [p.name, p.views, p.cartSessions, p.sold, p.conversion, p.revenue])] },
    { name: "Покупатели и акции", rows: [["Показатель", "Значение"], ["Новые покупатели", data.customers.newCustomers], ["Повторные покупатели", data.customers.repeatCustomers], ["Доля повторных, %", data.customers.repeatShare], ["Заказы с промокодом", data.marketing.promoOrders], ["Заказы с бонусами", data.marketing.loyaltyOrders], ["Сумма скидок, ₽", data.marketing.discountTotal], ["Выручка с акциями, ₽", data.marketing.marketingRevenue]] },
  ];
  sheets.unshift(
    { name: "Финансовая сводка", rows: [
      ["Финансовая отчётность магазина"], ["Период заказов (UTC)", detail.period.from, detail.period.to],
      ["Показатель", "Значение"], ["Неотменённых заказов", detail.totals.orders],
      ["Отменённых заказов", detail.totals.cancelled], ["Сумма заказов, ₽ (не оплаты)", detail.totals.orderedAmount],
      ["Оплачено по успешным операциям, ₽", detail.totals.paidAmount],
      ["Операций оплаты (все статусы)", detail.totals.paymentOperations],
      ["Скидки по заказам, ₽", detail.totals.discounts],
      ["Доставка, начисленная покупателям, ₽", detail.totals.deliveryCharged],
      ["Возвраты", "Нет отдельного источника данных; не рассчитаны"],
      ["Расходы на перевозчика", "Нет отдельного источника данных; не рассчитаны"],
      ["Методология"], ...Object.entries(detail.definitions).map(([k, v]) => [k, v])
    ] },
    { name: "Реестр заказов", rows: [["Заказ", "Дата UTC", "Статус", "Статус оплаты", "Покупатель", "Товары до скидок, ₽", "Товары, ₽", "Скидка, ₽", "Бонусы, ₽", "Доставка, ₽", "Итого, ₽", "Промокод"],
      ...detail.orders.map(o => [o.number, o.date, o.status, o.paymentStatus, o.customer, value(o.grossItems), value(o.items), value(o.discount), value(o.loyalty), value(o.delivery), value(o.total), value(o.promoCode)])] },
    { name: "Позиции заказов", rows: [["Заказ", "Товар", "Артикул", "Количество", "Вес, г", "Цена до скидки, ₽", "Цена, ₽", "Скидка, ₽", "Сумма, ₽"],
      ...detail.items.map(i => [i.orderNumber, i.product, i.sku, i.quantity, value(i.weightG), value(i.listPrice), value(i.unitPrice), value(i.discount), value(i.total)])] },
    { name: "Операции оплаты", rows: [["Заказ", "Номер операции", "Сумма, ₽", "Статус", "Создана UTC", "Оплачена UTC"],
      ...detail.payments.map(p => [p.orderNumber, value(p.operation), value(p.amount), p.status, p.createdAt, value(p.paidAt)])] },
    { name: "Скидки по заказам", rows: [["Заказ", "Источник", "Код", "Название", "Сумма, ₽", "Дата UTC"],
      ...detail.discounts.map(d => [d.orderNumber, d.source, value(d.code), d.name, value(d.amount), d.createdAt])] },
    { name: "Динамика заказов", rows: [["Дата UTC", "Неотменённых заказов", "Сумма заказов, ₽", "Отменённых заказов"],
      ...detail.daily.map(d => [d.date, d.orders, d.amount, d.cancelled])] }
  );
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}</Relationships>` },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i+1}.xml`, content: sheet(s.rows) })),
  ];
  const blob = zip(files), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `tea-market-analytics_${from}_${to}.xlsx`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
