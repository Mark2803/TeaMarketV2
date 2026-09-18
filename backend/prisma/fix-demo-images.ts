import "dotenv/config";

import { prisma } from "../src/database/prisma.js";

function demoSvgImage(label: string, tone: string, order?: number): string {
  const safeLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const suffix = order ? ` · ${order}` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" rx="64" fill="#${tone}"/><circle cx="600" cy="470" r="170" fill="#F6F0DF" fill-opacity="0.16"/><path d="M510 520c95-175 235-180 310-165-17 112-90 225-250 230 58-42 111-91 156-150-67 48-132 77-216 85Z" fill="#F6F0DF" fill-opacity="0.9"/><text x="600" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="700" fill="#F6F0DF">${safeLabel}${suffix}</text><text x="600" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#F6F0DF" fill-opacity="0.8">Tea Market · demo</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function toneFromOldUrl(url: string): string {
  const match = url.match(/placehold\.co\/1200x1200\/([0-9A-Fa-f]{6})\//);
  return match?.[1]?.toUpperCase() ?? "6B7657";
}

function categoryTone(sortOrder: number): string {
  const tones = ["355844", "887348", "6B7657", "7B4938", "8B7652", "4F6D58"];
  return tones[Math.abs(sortOrder) % tones.length] ?? "355844";
}

async function main(): Promise<void> {
  const products = await prisma.products.findMany({
    select: {
      id: true,
      name: true,
      product_images: {
        where: { image_url: { startsWith: "https://placehold.co/" } },
        orderBy: { sort_order: "asc" },
        select: { id: true, image_url: true, sort_order: true }
      }
    }
  });

  let productImagesUpdated = 0;
  for (const product of products) {
    for (const image of product.product_images) {
      await prisma.product_images.update({
        where: { id: image.id },
        data: {
          image_url: demoSvgImage(
            product.name,
            toneFromOldUrl(image.image_url),
            image.sort_order + 1
          )
        }
      });
      productImagesUpdated += 1;
    }
  }

  const categories = await prisma.categories.findMany({
    where: { image_url: null },
    select: { id: true, name: true, sort_order: true }
  });

  for (const category of categories) {
    await prisma.categories.update({
      where: { id: category.id },
      data: {
        image_url: demoSvgImage(category.name, categoryTone(category.sort_order))
      }
    });
  }

  const collections = await prisma.collections.findMany({
    where: { image_url: null },
    select: { id: true, name: true, sort_order: true }
  });

  for (const collection of collections) {
    await prisma.collections.update({
      where: { id: collection.id },
      data: {
        image_url: demoSvgImage(
          collection.name,
          categoryTone(collection.sort_order + 2)
        )
      }
    });
  }

  const homeBanners = await prisma.home_banners.findMany({
    where: { image_url: null },
    select: { id: true, title: true, sort_order: true }
  });

  for (const banner of homeBanners) {
    await prisma.home_banners.update({
      where: { id: banner.id },
      data: {
        image_url: demoSvgImage(
          banner.title,
          categoryTone(banner.sort_order + 4)
        )
      }
    });
  }

  console.log(`Обновлено тестовых изображений товаров: ${productImagesUpdated}`);
  console.log(`Добавлено тестовых изображений категорий: ${categories.length}`);
  console.log(`Добавлено тестовых изображений подборок: ${collections.length}`);
  console.log(`Добавлено тестовых изображений хиро: ${homeBanners.length}`);
  console.log("Реальные/S3 URL не изменялись.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
