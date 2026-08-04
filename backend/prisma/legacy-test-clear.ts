import "dotenv/config";

import { prisma } from "../src/database/prisma.js";

const TEST_MARKERS = [
  "test",
  "тест"
];

function containsTestMarker(
  value: string | null | undefined
): boolean {
  const normalized = value?.toLocaleLowerCase("ru-RU") ?? "";

  return TEST_MARKERS.some(
    (marker) => normalized.includes(marker)
  );
}

async function main(): Promise<void> {
  console.log("Поиск старых тестовых записей Tea Market...");

  const allProducts = await prisma.products.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      short_description: true
    }
  });

  const legacyProducts = allProducts.filter(
    (product) =>
      !product.slug.startsWith("demo-")
      && (
        containsTestMarker(product.name)
        || containsTestMarker(product.slug)
        || containsTestMarker(product.short_description)
      )
  );

  const productIds = legacyProducts.map(
    (product) => product.id
  );

  const variants = productIds.length > 0
    ? await prisma.product_variants.findMany({
        where: {
          product_id: { in: productIds }
        },
        select: { id: true }
      })
    : [];

  const variantIds = variants.map(
    (variant) => variant.id
  );

  if (variantIds.length > 0) {
    const carts = await prisma.carts.findMany({
      where: {
        cart_items: {
          some: {
            product_variant_id: { in: variantIds }
          }
        }
      },
      select: { id: true }
    });

    const cartIds = carts.map((cart) => cart.id);

    if (cartIds.length > 0) {
      await prisma.cart_items.deleteMany({
        where: { cart_id: { in: cartIds } }
      });
      await prisma.carts.deleteMany({
        where: { id: { in: cartIds } }
      });
    }
  }

  if (productIds.length > 0) {
    const orders = await prisma.orders.findMany({
      where: {
        order_items: {
          some: {
            product_id: { in: productIds }
          }
        }
      },
      select: { id: true }
    });

    const orderIds = orders.map((order) => order.id);

    if (orderIds.length > 0) {
      await prisma.order_status_history.deleteMany({
        where: { order_id: { in: orderIds } }
      });
      await prisma.order_payments.deleteMany({
        where: { order_id: { in: orderIds } }
      });
      await prisma.order_deliveries.deleteMany({
        where: { order_id: { in: orderIds } }
      });
      await prisma.order_items.deleteMany({
        where: { order_id: { in: orderIds } }
      });
      await prisma.orders.deleteMany({
        where: { id: { in: orderIds } }
      });
    }

    await prisma.product_relations.deleteMany({
      where: {
        OR: [
          { product_id: { in: productIds } },
          { related_product_id: { in: productIds } }
        ]
      }
    });
    await prisma.favorites.deleteMany({
      where: { product_id: { in: productIds } }
    });
    await prisma.collection_products.deleteMany({
      where: { product_id: { in: productIds } }
    });
    await prisma.product_categories.deleteMany({
      where: { product_id: { in: productIds } }
    });
    await prisma.product_images.deleteMany({
      where: { product_id: { in: productIds } }
    });
    await prisma.product_variants.deleteMany({
      where: { product_id: { in: productIds } }
    });
    await prisma.products.deleteMany({
      where: { id: { in: productIds } }
    });
  }

  const allCollections = await prisma.collections.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    }
  });

  const legacyCollectionIds = allCollections
    .filter(
      (collection) =>
        containsTestMarker(collection.name)
        || containsTestMarker(collection.slug)
    )
    .map((collection) => collection.id);

  if (legacyCollectionIds.length > 0) {
    await prisma.collection_products.deleteMany({
      where: {
        collection_id: { in: legacyCollectionIds }
      }
    });
    await prisma.collections.deleteMany({
      where: {
        id: { in: legacyCollectionIds }
      }
    });
  }

  const allCategories = await prisma.categories.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    }
  });

  const legacyCategoryIds = allCategories
    .filter(
      (category) =>
        containsTestMarker(category.name)
        || containsTestMarker(category.slug)
    )
    .map((category) => category.id);

  if (legacyCategoryIds.length > 0) {
    await prisma.product_categories.deleteMany({
      where: {
        category_id: { in: legacyCategoryIds }
      }
    });

    await prisma.categories.deleteMany({
      where: {
        id: { in: legacyCategoryIds },
        other_categories: { none: {} }
      }
    });
  }

  console.log("Очистка завершена:");
  console.log(`- удалено старых тестовых товаров: ${legacyProducts.length}`);
  console.log(`- удалено старых тестовых подборок: ${legacyCollectionIds.length}`);
  console.log(`- удалено старых тестовых категорий: ${legacyCategoryIds.length}`);
  console.log("Товары demo-* и новые демонстрационные справочники сохранены.");
}

main()
  .catch((error: unknown) => {
    console.error("Ошибка очистки старых тестовых данных:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
