import { randomUUID } from "node:crypto";
import { prisma } from "../src/database/prisma.js";

const API = process.env.ANALYTICS_TEST_API ?? "http://localhost:3000/api";
const visitorId = randomUUID();
const sessionId = randomUUID();
const guestToken = randomUUID();
const source = `e2e-test-${Date.now()}`;
let orderId: string | null = null;
let variantId: string | null = null;
let originalStock: number | null = null;

function pass(s: string) { console.log(`[PASS] ${s}`); }
function info(s: string) { console.log(`[INFO] ${s}`); }
function fail(s: string): never { throw new Error(s); }

async function post(path: string, body: unknown, headers: Record<string,string> = {}) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) fail(`${path}: HTTP ${r.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

async function cleanup() {
  if (orderId) {
    const items = await prisma.order_items.findMany({ where: { order_id: orderId }, select: { sku: true, quantity: true } });
    for (const item of items) {
      await prisma.product_variants.updateMany({
        where: { sku: item.sku },
        data: { stock_quantity: { increment: item.quantity } }
      });
    }
    await prisma.analytics_order_attributions.deleteMany({ where: { order_id: orderId } });
    await prisma.order_discounts.deleteMany({ where: { order_id: orderId } });
    await prisma.order_status_history.deleteMany({ where: { order_id: orderId } });
    await prisma.order_payments.deleteMany({ where: { order_id: orderId } });
    await prisma.order_deliveries.deleteMany({ where: { order_id: orderId } });
    await prisma.order_items.deleteMany({ where: { order_id: orderId } });
    await prisma.orders.deleteMany({ where: { id: orderId } });
  }
  await prisma.carts.deleteMany({ where: { guest_token: guestToken } });
  await prisma.analytics_sessions.deleteMany({ where: { id: sessionId } }); // cascade removes events
}

async function main() {
  info(`Visitor: ${visitorId}`);
  info(`Session: ${sessionId}`);
  info(`Source: ${source}`);

  const variant = await prisma.product_variants.findFirst({
    where: { status: "active", is_available: true, stock_quantity: { gt: 0 }, products: { is_active: true } },
    orderBy: { stock_quantity: "desc" },
    select: { id: true, product_id: true, price: true, stock_quantity: true, products: { select: { name: true } } }
  });
  if (!variant) fail("Нет активного варианта товара с остатком > 0.");
  variantId = variant.id;
  originalStock = variant.stock_quantity;

  const delivery = await prisma.delivery_methods.findFirst({ where: { is_active: true }, select: { id: true, name: true } });
  const payment = await prisma.payment_methods.findFirst({ where: { is_active: true }, select: { id: true, name: true } });
  if (!delivery) fail("Нет активного способа доставки.");
  if (!payment) fail("Нет активного способа оплаты.");

  info(`Test product: ${variant.products.name}`);
  info(`Stock before: ${variant.stock_quantity}`);

  // Prepare a guest cart without touching any real cart.
  const cart = await prisma.carts.create({
    data: {
      guest_token: guestToken,
      status: "active",
      cart_items: {
        create: {
          product_variant_id: variant.id,
          quantity: 1,
          price_at_addition: variant.price
        }
      }
    },
    select: { id: true }
  });
  pass(`isolated guest cart created (${cart.id})`);

  const baseSession = {
    landingPath: "/?utm_source=" + source,
    referrer: "",
    source,
    medium: "test",
    campaign: "analytics-e2e",
    deviceType: "desktop"
  };

  for (const eventType of ["page_view", "product_view", "add_to_cart", "checkout_started"]) {
    await post("/analytics/events", {
      sessionId, visitorId, eventType,
      path: eventType === "page_view" ? "/" : "/products/analytics-e2e",
      ...(eventType === "product_view" || eventType === "add_to_cart" ? { productId: variant.product_id } : {}),
      ...(eventType === "add_to_cart" ? { variantId: variant.id, quantity: 1 } : {}),
      session: baseSession
    });
    pass(`${eventType} accepted`);
  }

  const before = await prisma.analytics_events.count({ where: { session_id: sessionId } });
  if (before !== 4) fail(`Ожидалось 4 события, найдено ${before}.`);
  pass("4 analytics events stored");

  const created = await post("/orders", {
    customerName: "Analytics E2E Test",
    phone: "+79990000000",
    comment: "AUTO ANALYTICS E2E TEST - SAFE TO DELETE",
    deliveryMethodId: delivery.id,
    delivery: {
      recipientName: "Analytics E2E Test",
      phone: "+79990000000",
      fullAddress: "Тестовый адрес аналитики, 1"
    },
    paymentMethodId: payment.id,
    loyaltyToSpend: 0
  }, {
    "x-guest-token": guestToken,
    "x-analytics-session-id": sessionId
  });

  orderId = created?.data?.id;
  if (!orderId) fail("API создал заказ без id.");
  pass(`test order created: ${created.data.order_number}`);

  const attribution = await prisma.analytics_order_attributions.findUnique({ where: { order_id: orderId } });
  if (!attribution || attribution.session_id !== sessionId) fail("Заказ не связан с аналитической сессией.");
  pass("order attribution stored");

  const order = await prisma.orders.findUnique({ where: { id: orderId }, select: { status: true, total_amount: true } });
  if (!order || order.status === "cancelled") fail("Тестовый заказ отсутствует или отменён.");
  pass(`order contributes to orders/revenue (${Number(order.total_amount).toFixed(2)} ₽)`);

  const trackedVisitor = await prisma.analytics_order_attributions.findFirst({
    where: { order_id: orderId, session: { visitor_id: visitorId, source } },
    select: { order_id: true }
  });
  if (!trackedVisitor) fail("Источник/visitor заказа не совпадает с тестовой сессией.");
  pass("source -> visitor -> session -> order chain verified");

  const stockAfter = await prisma.product_variants.findUnique({ where: { id: variant.id }, select: { stock_quantity: true } });
  if (!stockAfter || stockAfter.stock_quantity !== originalStock - 1) {
    fail(`Остаток после заказа некорректен: ожидалось ${originalStock - 1}, получено ${stockAfter?.stock_quantity}.`);
  }
  pass("stock decrement verified");

  console.log("");
  console.log("ANALYTICS E2E TEST: PASS");
}

main()
  .catch((e) => {
    console.error("");
    console.error(`[FAIL] ${e instanceof Error ? e.message : String(e)}`);
    console.error("ANALYTICS E2E TEST: FAIL");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      if (variantId && originalStock !== null) {
        const restored = await prisma.product_variants.findUnique({ where: { id: variantId }, select: { stock_quantity: true } });
        if (restored?.stock_quantity === originalStock) pass("cleanup: stock restored");
        else console.error(`[WARN] cleanup: stock expected ${originalStock}, actual ${restored?.stock_quantity}`);
      }
      pass("cleanup: test order/cart/analytics removed");
    } catch (e) {
      console.error(`[WARN] CLEANUP FAILED: ${e instanceof Error ? e.message : String(e)}`);
      console.error("[WARN] Do not run the test again until cleanup is checked.");
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  });
