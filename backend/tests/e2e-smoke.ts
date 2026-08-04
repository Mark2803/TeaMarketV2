import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";

import app from "../src/app.js";
import { prisma } from "../src/database/prisma.js";

const AUTH_CODE = "654321";
const TEST_PHONE = `+7998${Date.now().toString().slice(-7)}`;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Не удалось определить порт тестового сервера");
  }

  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const guestToken = randomUUID();
  let bearerToken = "";
  let createdOrderId: string | null = null;
  let createdCustomerId: string | null = null;
  const stockBefore = new Map<string, number>();

  async function api<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        "x-guest-token": guestToken,
        ...init.headers
      }
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `${init.method ?? "GET"} ${path}: ${response.status} ${body?.error?.message ?? "ошибка API"}`
      );
    }

    return body as T;
  }

  try {
    const demoCount = await prisma.products.count({
      where: { slug: { startsWith: "demo-" } }
    });
    assert(demoCount === 100, `Ожидалось 100 demo-товаров, найдено ${demoCount}`);

    const health = await api<{ status: string; database: string; products: number }>("/health");
    assert(health.status === "ok", "Health endpoint вернул неверный статус");
    assert(health.database === "connected", "Health endpoint не подтвердил БД");

    const product = await prisma.products.findFirst({
      where: {
        slug: { startsWith: "demo-" },
        is_active: true,
        product_variants: { some: { status: "active", is_available: true, stock_quantity: { gt: 2 } } }
      },
      include: {
        product_variants: {
          where: { status: "active", is_available: true, stock_quantity: { gt: 2 } },
          orderBy: { sort_order: "asc" }
        }
      }
    });
    assert(product, "Не найден подходящий демонстрационный товар");
    assert(product.product_variants.length === 2, "Карточка demo-товара должна иметь 2 варианта");

    const variant = product.product_variants[0];
    stockBefore.set(variant.id, variant.stock_quantity);

    const products = await api<{ data: Array<{ id: string }>; pagination: { total: number } }>("/products?page=1&limit=100");
    assert(products.pagination.total >= 100, "Публичный каталог содержит меньше 100 товаров");

    const categories = await api<{ data: Array<{ id: string; product_count: number }> }>("/categories");
    assert(categories.data.length > 0, "Категории не загружены");
    assert(categories.data.some((item) => item.product_count > 0), "Категории не содержат товары");

    const detail = await api<{ data: { id: string; product_variants: unknown[] } }>(`/products/${product.slug}`);
    assert(detail.data.id === product.id, "Карточка товара вернула другой товар");
    assert(detail.data.product_variants.length === 2, "API карточки не вернул 2 варианта");

    const searchWord = (product.taste ?? product.tea_type ?? product.name).split(/[ ,]+/)[0];
    const search = await api<{ data: Array<{ id: string }> }>(`/search?q=${encodeURIComponent(searchWord)}`);
    assert(search.data.some((item) => item.id === product.id), "Поиск не нашёл товар по характеристике");

    await api("/cart/items", {
      method: "POST",
      body: JSON.stringify({ productVariantId: variant.id, quantity: 1 })
    });

    const guestCart = await api<{ data: { items: Array<{ variant: { id: string } }> } }>("/cart");
    assert(guestCart.data.items.some((item) => item.variant.id === variant.id), "Гостевая корзина не сохранила товар");

    await prisma.auth_codes.create({
      data: {
        phone: TEST_PHONE,
        code_hash: sha256(AUTH_CODE),
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        max_attempts: 5
      }
    });

    const auth = await api<{
      data: { token: string; customer: { id: string } };
    }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ phone: TEST_PHONE, code: AUTH_CODE })
    });

    bearerToken = auth.data.token;
    createdCustomerId = auth.data.customer.id;

    await api("/profile/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "Сквозной тест", email: "e2e@example.test" })
    });

    await api("/cart/merge", { method: "POST" });
    const customerCart = await api<{ data: { items: Array<{ variant: { id: string } }> } }>("/cart");
    assert(customerCart.data.items.some((item) => item.variant.id === variant.id), "Корзина не перенеслась после входа");

    await api(`/favorites/${product.id}`, { method: "POST" });
    const favorites = await api<{
      data: Array<{
        addedAt: string;
        product: {
          id: string;
        };
      }>;
    }>("/favorites");

    assert(
      favorites.data.some(
        (item) =>
          item.product.id === product.id
      ),
      "Избранное не сохранилось"
    );

    const addressResponse = await api<{ data: { id: string } }>("/customer-addresses", {
      method: "POST",
      body: JSON.stringify({
        addressName: "E2E адрес",
        recipientName: "Сквозной тест",
        phone: TEST_PHONE,
        region: "Санкт-Петербург",
        city: "Санкт-Петербург",
        street: "Тестовая улица",
        house: "1",
        apartment: "1",
        postalCode: "190000",
        isDefault: true
      })
    });
    assert(addressResponse.data.id, "Адрес не создан");

    const deliveries = await api<{ data: Array<{ id: string; name: string }> }>("/delivery-methods");
    const payments = await api<{ data: Array<{ id: string }> }>("/payment-methods");
    const delivery = deliveries.data.find((item) => /курьер/i.test(item.name)) ?? deliveries.data[0];
    const payment = payments.data[0];
    assert(delivery && payment, "Нет активного способа доставки или оплаты");

    const order = await api<{ data: { id: string; order_number: string } }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Сквозной тест",
        phone: TEST_PHONE,
        email: "e2e@example.test",
        deliveryMethodId: delivery.id,
        delivery: {
          recipientName: "Сквозной тест",
          phone: TEST_PHONE,
          fullAddress: "Санкт-Петербург, Тестовая улица, д. 1, кв. 1"
        },
        paymentMethodId: payment.id
      })
    });
    createdOrderId = order.data.id;

    const stockAfter = await prisma.product_variants.findUniqueOrThrow({
      where: { id: variant.id },
      select: { stock_quantity: true }
    });
    assert(
      stockAfter.stock_quantity === (stockBefore.get(variant.id) ?? 0) - 1,
      "Остаток товара не уменьшился после заказа"
    );

    const history = await api<{ data: Array<{ order_number: string }> }>("/orders/my");
    assert(history.data.some((item) => item.order_number === order.data.order_number), "Заказ не появился в истории");

    const orderDetail = await api<{ data: { order_number: string; order_items: unknown[] } }>(
      `/orders/my/${encodeURIComponent(order.data.order_number)}`
    );
    assert(orderDetail.data.order_items.length > 0, "Детальная страница заказа не содержит позиции");

    console.log("E2E smoke test passed: catalog → cart → auth → favorites → address → order → history");
  } finally {
    try {
      if (createdOrderId) {
        const items = await prisma.order_items.findMany({ where: { order_id: createdOrderId } });
        for (const item of items) {
          const variant = await prisma.product_variants.findFirst({ where: { sku: item.sku } });
          if (variant) {
            await prisma.product_variants.update({
              where: { id: variant.id },
              data: { stock_quantity: { increment: item.quantity } }
            });
          }
        }
        await prisma.order_status_history.deleteMany({ where: { order_id: createdOrderId } });
        await prisma.order_payments.deleteMany({ where: { order_id: createdOrderId } });
        await prisma.order_deliveries.deleteMany({ where: { order_id: createdOrderId } });
        await prisma.order_items.deleteMany({ where: { order_id: createdOrderId } });
        await prisma.orders.delete({ where: { id: createdOrderId } });
      }

      if (createdCustomerId) {
        const carts = await prisma.carts.findMany({ where: { customer_id: createdCustomerId }, select: { id: true } });
        const cartIds = carts.map((item) => item.id);
        if (cartIds.length > 0) {
          await prisma.cart_items.deleteMany({ where: { cart_id: { in: cartIds } } });
          await prisma.carts.deleteMany({ where: { id: { in: cartIds } } });
        }
        await prisma.favorites.deleteMany({ where: { customer_id: createdCustomerId } });
        await prisma.customer_addresses.deleteMany({ where: { customer_id: createdCustomerId } });
        await prisma.auth_sessions.deleteMany({ where: { customer_id: createdCustomerId } });
        await prisma.customers.delete({ where: { id: createdCustomerId } }).catch(() => undefined);
      }

      await prisma.auth_codes.deleteMany({ where: { phone: TEST_PHONE } });
      const guestCarts = await prisma.carts.findMany({ where: { guest_token: guestToken }, select: { id: true } });
      const guestCartIds = guestCarts.map((item) => item.id);
      if (guestCartIds.length > 0) {
        await prisma.cart_items.deleteMany({ where: { cart_id: { in: guestCartIds } } });
        await prisma.carts.deleteMany({ where: { id: { in: guestCartIds } } });
      }
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  }
}

main().catch((error) => {
  console.error("E2E smoke test failed:", error);
  process.exitCode = 1;
});
