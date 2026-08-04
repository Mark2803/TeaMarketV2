import { prisma } from "../../database/prisma.js";

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/й/g, "и")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}

function containsWordPrefix(value: string, queryWord: string): boolean {
  return normalize(value)
    .split(" ")
    .some((valueWord) =>
      valueWord === queryWord || valueWord.startsWith(queryWord)
    );
}

type SearchableProduct = Awaited<ReturnType<typeof loadCandidates>>[number];

function searchableText(product: SearchableProduct): string {
  return [
    product.name,
    product.short_description,
    product.tea_type,
    product.country,
    product.region,
    product.manufacturer,
    product.fermentation_level,
    product.product_form,
    product.about_tea,
    product.taste,
    product.aroma,
    product.effect,
    product.beneficial_properties,
    product.brewing_tips,
    product.seo_title,
    product.seo_description,
    product.water_temperature_c,
    product.tea_amount_g,
    product.brewing_time_seconds,
    product.infusion_count,
    ...product.product_variants.flatMap((variant) => [
      variant.sku,
      variant.weight_g
    ]),
    ...product.product_categories.flatMap((relation) => [
      relation.categories.name,
      relation.categories.slug,
      relation.categories.description
    ]),
    ...product.collection_products.flatMap((relation) => [
      relation.collections.name,
      relation.collections.slug,
      relation.collections.description
    ])
  ].join(" ");
}

function fieldScore(value: unknown, query: string, queryWords: string[], weight: number): number {
  const normalized = normalize(value);
  if (!normalized) return 0;

  let score = 0;
  if (normalized === query) score += weight * 5;
  else if (normalized.startsWith(query)) score += weight * 4;
  else if (normalized.includes(query)) score += weight * 3;

  for (const queryWord of queryWords) {
    if (containsWordPrefix(normalized, queryWord)) score += weight;
  }

  return score;
}

function relevance(product: SearchableProduct, query: string, queryWords: string[]): number {
  return (
    fieldScore(product.name, query, queryWords, 30) +
    fieldScore(product.product_variants.map((item) => item.sku).join(" "), query, queryWords, 28) +
    fieldScore(product.product_categories.map((item) => item.categories.name).join(" "), query, queryWords, 24) +
    fieldScore(product.collection_products.map((item) => item.collections.name).join(" "), query, queryWords, 20) +
    fieldScore(product.tea_type, query, queryWords, 18) +
    fieldScore(product.region, query, queryWords, 16) +
    fieldScore(product.country, query, queryWords, 15) +
    fieldScore(product.manufacturer, query, queryWords, 14) +
    fieldScore(product.fermentation_level, query, queryWords, 13) +
    fieldScore(product.product_form, query, queryWords, 13) +
    fieldScore(product.taste, query, queryWords, 12) +
    fieldScore(product.aroma, query, queryWords, 12) +
    fieldScore(product.effect, query, queryWords, 12) +
    fieldScore(product.beneficial_properties, query, queryWords, 10) +
    fieldScore(product.short_description, query, queryWords, 9) +
    fieldScore(product.about_tea, query, queryWords, 8) +
    fieldScore(product.brewing_tips, query, queryWords, 5)
  );
}

async function loadCandidates() {
  const now = new Date();

  return prisma.products.findMany({
    where: {
      is_active: true,
      product_variants: {
        some: {
          status: "active"
        }
      }
    },
    include: {
      product_images: {
        orderBy: { sort_order: "asc" }
      },
      product_variants: {
        where: { status: "active" },
        orderBy: { sort_order: "asc" }
      },
      product_categories: {
        include: {
          categories: true
        }
      },
      collection_products: {
        where: {
          collections: {
            is_active: true,
            AND: [
              { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
              { OR: [{ ends_at: null }, { ends_at: { gte: now } }] }
            ]
          }
        },
        include: {
          collections: true
        }
      }
    }
  });
}

export async function searchProducts(query: string) {
  const normalizedQuery = normalize(query);
  const queryWords = words(normalizedQuery);
  const products = await loadCandidates();

  return products
    .filter((product) => {
      const text = normalize(searchableText(product));
      return queryWords.every((queryWord) =>
        containsWordPrefix(text, queryWord)
      );
    })
    .map((product) => ({
      product,
      score: relevance(product, normalizedQuery, queryWords)
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.product.name.localeCompare(right.product.name, "ru-RU")
    )
    .slice(0, 100)
    .map(({ product }) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      short_description: product.short_description,
      is_active: product.is_active,
      tea_type: product.tea_type,
      country: product.country,
      region: product.region,
      manufacturer: product.manufacturer,
      product_images: product.product_images,
      product_variants: product.product_variants
    }));
}
