import "dotenv/config";

import { prisma } from "../src/database/prisma.js";

const COLLECTION_SLUGS = [
  "new-arrivals",
  "bestsellers",
  "energy",
  "relax",
  "high-mountain",
  "starter-teas"
];

const CATEGORY_SLUGS = [
  "taiwan-oolong", "wuyi-oolong", "anxi-oolong", "guangdong-oolong", "oolong",
  "shu-puer", "sheng-puer", "cha-gao", "puer",
  "chinese-green", "japanese-green", "green-tea",
  "yunnan-red", "fujian-red", "red-tea",
  "fuding-white", "yunnan-white", "white-tea",
  "chinese-yellow", "yellow-tea",
  "jasmine-tea", "fruit-tea", "scented-tea",
  "ceremonial-matcha", "culinary-matcha", "matcha",
  "herbal-blends", "herbal",
  "gift-sets", "tea-sets"
];

const CUSTOMER_PHONES = [
  "+79990000001",
  "+79990000002"
];

const ORDER_NUMBERS = [
  "DEMO-000001",
  "DEMO-000002"
];

const GUEST_TOKEN =
  "00000000-0000-4000-8000-000000000001";

async function main(): Promise<void> {
  console.log("Удаление демонстрационных данных Tea Market...");

  const orders = await prisma.orders.findMany({
    where: { order_number: { in: ORDER_NUMBERS } },
    select: { id: true }
  });
  const orderIds = orders.map((item) => item.id);

  if (orderIds.length > 0) {
    await prisma.order_status_history.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.order_payments.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.order_deliveries.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.order_items.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.orders.deleteMany({ where: { id: { in: orderIds } } });
  }

  const customers = await prisma.customers.findMany({
    where: { phone: { in: CUSTOMER_PHONES } },
    select: { id: true }
  });
  const customerIds = customers.map((item) => item.id);

  const carts = await prisma.carts.findMany({
    where: {
      OR: [
        { customer_id: { in: customerIds } },
        { guest_token: GUEST_TOKEN }
      ]
    },
    select: { id: true }
  });
  const cartIds = carts.map((item) => item.id);

  if (cartIds.length > 0) {
    await prisma.cart_items.deleteMany({ where: { cart_id: { in: cartIds } } });
    await prisma.carts.deleteMany({ where: { id: { in: cartIds } } });
  }

  if (customerIds.length > 0) {
    await prisma.auth_sessions.deleteMany({ where: { customer_id: { in: customerIds } } });
    await prisma.favorites.deleteMany({ where: { customer_id: { in: customerIds } } });
    await prisma.customer_addresses.deleteMany({ where: { customer_id: { in: customerIds } } });
    await prisma.customers.deleteMany({ where: { id: { in: customerIds } } });
  }

  const products = await prisma.products.findMany({
    where: { slug: { startsWith: "demo-" } },
    select: { id: true }
  });
  const productIds = products.map((item) => item.id);

  if (productIds.length > 0) {
    await prisma.product_relations.deleteMany({
      where: {
        OR: [
          { product_id: { in: productIds } },
          { related_product_id: { in: productIds } }
        ]
      }
    });
    await prisma.collection_products.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.product_categories.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.product_images.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.product_variants.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.products.deleteMany({ where: { id: { in: productIds } } });
  }

  await prisma.collections.deleteMany({
    where: { slug: { in: COLLECTION_SLUGS } }
  });

  for (const slug of CATEGORY_SLUGS) {
    await prisma.categories.deleteMany({
      where: {
        slug,
        product_categories: { none: {} },
        other_categories: { none: {} }
      }
    });
  }

  await prisma.auth_codes.deleteMany({
    where: { phone: { in: CUSTOMER_PHONES } }
  });

  console.log("Демонстрационные данные удалены.");
  console.log("Способы доставки и оплаты сохранены как справочники.");
}

main()
  .catch((error: unknown) => {
    console.error("Ошибка удаления демонстрационных данных:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
