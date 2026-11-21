import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { prisma } from "../../database/prisma.js";

/**
 * HTML для поисковых роботов (nginx перенаправляет сюда публичные страницы).
 * В шаблон frontend/dist/index.html подставляются мета-теги, Open Graph, JSON-LD
 * и текстовое содержимое страницы. React при загрузке заменяет содержимое #root.
 */
const router = Router();
const SITE = "https://tea-master-team.ru";
const BRAND = "Чайный Маркет";
const LOGO = `${SITE}/brand-logo.svg`;
const normalizeBrand = (value: string): string => value.replace(/Tea Market Demo/gi, BRAND);

const esc = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char] ?? char);

/** Текст для description: без переносов, не длиннее 300 символов. */
const plain = (value: string | null | undefined, max = 300): string => {
  const text = (value ?? "").replace(/^##\s+/gm, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text;
};

/** Абзацы текста; строки, начинающиеся с "## ", становятся подзаголовками. */
const paragraphs = (value: string | null | undefined): string => (value ?? "")
  .split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  .map((block) => block.startsWith("## ") ? `<h2>${esc(block.slice(3))}</h2>` : `<p>${esc(block)}</p>`)
  .join("\n");

const rub = (value: unknown): string => `${Number(value).toLocaleString("ru-RU")} ₽`;
const grams = (value: unknown): string => `${Number(value).toLocaleString("ru-RU")} г`;

function canonicalUrl(raw: string | null | undefined, fallback: string): string {
  const candidate = raw?.trim();
  if (!candidate) return SITE + fallback;
  try {
    const parsed = new URL(candidate, SITE);
    // Do not permit canonical URLs to point to third-party hosts or unsafe schemes.
    if (parsed.protocol === "https:" && ["tea-master-team.ru", "www.tea-master-team.ru"].includes(parsed.hostname)) {
      return parsed.origin + parsed.pathname + parsed.search;
    }
  } catch { /* Fall back to the page URL. */ }
  return SITE + fallback;
}

async function htmlTemplate(): Promise<string> {
  const candidates = [
    process.env.SEO_HTML_TEMPLATE_PATH,
    path.resolve(process.cwd(), "../frontend/dist/index.html"),
    "/home/ivanc1539/web/tea-master-team.ru/public_html/index.html"
  ].filter((value): value is string => Boolean(value));
  for (const filename of candidates) {
    try { return await readFile(filename, "utf8"); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("SEO HTML template not found; configure SEO_HTML_TEMPLATE_PATH");
}

type Crumb = { name: string; path: string };
type Page = {
  title: string;
  description: string;
  canonical: string;
  indexed: boolean;
  ogType: "website" | "product" | "article";
  image?: string | null;
  jsonLd: object[];
  body: string;
};

const breadcrumbs = (items: Crumb[]): { html: string; jsonLd: object } => ({
  html: `<nav aria-label="Навигация"><ol>${items.map((item, index) => index === items.length - 1
    ? `<li>${esc(item.name)}</li>`
    : `<li><a href="${esc(item.path)}">${esc(item.name)}</a></li>`).join("")}</ol></nav>`,
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name, item: SITE + item.path
    }))
  }
});

const activeVariant = { status: "active" } as const;
const productCardSelect = {
  name: true, slug: true,
  product_images: { orderBy: [{ sort_order: "asc" as const }, { id: "asc" as const }], take: 1, select: { image_url: true } },
  product_variants: { where: activeVariant, orderBy: { price: "asc" as const }, take: 1, select: { price: true } }
};
type ProductCard = { name: string; slug: string; product_images: { image_url: string }[]; product_variants: { price: unknown }[] };

function productList(title: string, products: ProductCard[]): { html: string; jsonLd: object | null } {
  if (!products.length) return { html: "", jsonLd: null };
  return {
    html: `<section><h2>${esc(title)}</h2><ul>${products.map((product) => {
      const price = product.product_variants[0]?.price;
      return `<li><a href="/products/${encodeURIComponent(product.slug)}">${esc(product.name)}</a>${price !== undefined ? ` — от ${esc(rub(price))}` : ""}</li>`;
    }).join("")}</ul></section>`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem", position: index + 1, name: product.name,
        url: `${SITE}/products/${encodeURIComponent(product.slug)}`
      }))
    }
  };
}

const visibleProduct = { is_active: true, is_indexed: true };

async function productPage(slug: string, pathname: string): Promise<Page | null> {
  const item = await prisma.products.findUnique({ where: { slug }, include: {
    product_images: { orderBy: [{ sort_order: "asc" }, { id: "asc" }] },
    product_variants: { where: activeVariant, orderBy: [{ sort_order: "asc" }, { weight_g: "asc" }] },
    product_categories: { orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }], include: { categories: true } },
    articles: { where: { status: "published", OR: [{ published_at: null }, { published_at: { lte: new Date() } }] },
      select: { title: true, slug: true }, take: 10 }
  } });
  if (!item) return null;

  const title = item.seo_title?.trim() || `${item.name} — купить с доставкой | ${BRAND}`;
  const description = plain(item.seo_description) || plain(item.short_description) || plain(item.about_tea) || item.name;
  const canonical = canonicalUrl(item.canonical_url, pathname);
  const category = item.product_categories.find((link) => link.categories.is_visible)?.categories;
  const crumbs = breadcrumbs([
    { name: "Главная", path: "/" },
    { name: "Каталог", path: "/catalog" },
    ...(category ? [{ name: category.name, path: `/catalog/${encodeURIComponent(category.slug)}` }] : []),
    { name: item.name, path: pathname }
  ]);
  const images = item.product_images.map((image) => image.image_url);
  const inStock = (variant: { is_available: boolean; stock_quantity: number }) => variant.is_available && variant.stock_quantity > 0;

  const characteristics: Array<[string, string | null | undefined]> = [
    ["Вид чая", item.tea_type], ["Страна", item.country], ["Регион", item.region],
    ["Производитель", item.manufacturer], ["Ферментация", item.fermentation_level], ["Форма", item.product_form],
    ["Вкус", item.taste], ["Аромат", item.aroma], ["Эффект", item.effect],
    ["Температура воды", item.water_temperature_c ? `${item.water_temperature_c} °C` : null],
    ["Количество чая", item.tea_amount_g ? grams(item.tea_amount_g) : null],
    ["Время заваривания", item.brewing_time_seconds ? `${item.brewing_time_seconds} сек` : null],
    ["Количество проливов", item.infusion_count ? String(item.infusion_count) : null]
  ];
  const filled = characteristics.filter((row): row is [string, string] => Boolean(row[1]?.trim()));

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description,
    url: canonical,
    image: images,
    sku: item.product_variants[0]?.sku,
    category: category?.name ?? item.tea_type ?? undefined,
    brand: item.manufacturer ? { "@type": "Brand", name: item.manufacturer } : undefined,
    additionalProperty: filled.map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
    offers: item.product_variants.map((variant) => ({
      "@type": "Offer",
      name: `${item.name}, ${grams(variant.weight_g)}`,
      sku: variant.sku,
      price: Number(variant.price).toFixed(2),
      priceCurrency: "RUB",
      availability: inStock(variant) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: canonical,
      seller: { "@type": "Organization", name: BRAND }
    }))
  };

  const body = [
    crumbs.html,
    `<article><h1>${esc(item.name)}</h1>`,
    images.length ? images.map((url, index) => `<img src="${esc(url)}" alt="${esc(item.product_images[index]?.alt_text || item.name)}" />`).join("") : "",
    item.short_description ? `<p>${esc(item.short_description)}</p>` : "",
    item.product_variants.length ? `<section><h2>Цена</h2><ul>${item.product_variants.map((variant) =>
      `<li>${esc(grams(variant.weight_g))} — ${esc(rub(variant.price))}${inStock(variant) ? ", в наличии" : ", нет в наличии"}</li>`).join("")}</ul></section>` : "",
    filled.length ? `<section><h2>Характеристики</h2><dl>${filled.map(([name, value]) => `<dt>${esc(name)}</dt><dd>${esc(value)}</dd>`).join("")}</dl></section>` : "",
    item.about_tea ? `<section><h2>О чае</h2>${paragraphs(item.about_tea)}</section>` : "",
    item.beneficial_properties ? `<section><h2>Полезные свойства</h2>${paragraphs(item.beneficial_properties)}</section>` : "",
    item.brewing_tips ? `<section><h2>Как заваривать</h2>${paragraphs(item.brewing_tips)}</section>` : "",
    item.articles.length ? `<section><h2>Статьи о чае</h2><ul>${item.articles.map((article) =>
      `<li><a href="/articles/${encodeURIComponent(article.slug)}">${esc(article.title)}</a></li>`).join("")}</ul></section>` : "",
    category ? `<p><a href="/catalog/${encodeURIComponent(category.slug)}">Весь чай в категории «${esc(category.name)}»</a></p>` : "",
    "</article>"
  ].join("\n");

  return {
    title, description, canonical, body, image: images[0], ogType: "product",
    indexed: item.is_active && item.is_indexed,
    jsonLd: [product, crumbs.jsonLd]
  };
}

async function categoryPage(slug: string, pathname: string): Promise<Page | null> {
  const item = await prisma.categories.findUnique({ where: { slug }, include: {
    other_categories: { where: { is_visible: true }, orderBy: { sort_order: "asc" }, select: { name: true, slug: true } },
    product_categories: { where: { products: visibleProduct }, orderBy: { sort_order: "asc" }, take: 200,
      select: { products: { select: productCardSelect } } }
  } });
  if (!item) return null;
  const title = item.seo_title?.trim() || `${item.name} — купить в интернет-магазине | ${BRAND}`;
  const description = plain(item.seo_description) || plain(item.description) || `${item.name} в интернет-магазине ${BRAND}: описание, цены, доставка по России.`;
  const crumbs = breadcrumbs([{ name: "Главная", path: "/" }, { name: "Каталог", path: "/catalog" }, { name: item.name, path: pathname }]);
  const list = productList(`Товары: ${item.name}`, item.product_categories.map((link) => link.products));
  const body = [
    crumbs.html, `<h1>${esc(item.name)}</h1>`, paragraphs(item.description),
    item.other_categories.length ? `<section><h2>Подкатегории</h2><ul>${item.other_categories.map((child) =>
      `<li><a href="/catalog/${encodeURIComponent(child.slug)}">${esc(child.name)}</a></li>`).join("")}</ul></section>` : "",
    list.html
  ].join("\n");
  return {
    title, description, body, image: item.image_url, ogType: "website",
    canonical: canonicalUrl(item.canonical_url, pathname),
    indexed: item.is_visible && item.is_indexed,
    jsonLd: [crumbs.jsonLd, ...(list.jsonLd ? [list.jsonLd] : [])]
  };
}

async function collectionPage(slug: string, pathname: string): Promise<Page | null> {
  const item = await prisma.collections.findUnique({ where: { slug }, include: {
    collection_products: { where: { products: visibleProduct }, orderBy: { sort_order: "asc" }, take: 200,
      select: { products: { select: productCardSelect } } }
  } });
  if (!item) return null;
  const now = new Date();
  const title = item.seo_title?.trim() || `${item.name} | ${BRAND}`;
  const description = plain(item.seo_description) || plain(item.description) || `${item.name} — подборка чая в интернет-магазине ${BRAND}.`;
  const crumbs = breadcrumbs([{ name: "Главная", path: "/" }, { name: "Подборки", path: "/collections" }, { name: item.name, path: pathname }]);
  const list = productList("Чай в подборке", item.collection_products.map((link) => link.products));
  return {
    title, description, image: item.image_url, ogType: "website",
    canonical: canonicalUrl(item.canonical_url, pathname),
    indexed: item.is_active && item.is_indexed && (!item.starts_at || item.starts_at <= now) && (!item.ends_at || item.ends_at >= now),
    body: [crumbs.html, `<h1>${esc(item.name)}</h1>`, paragraphs(item.description), list.html].join("\n"),
    jsonLd: [crumbs.jsonLd, ...(list.jsonLd ? [list.jsonLd] : [])]
  };
}

async function articlePage(slug: string, pathname: string): Promise<Page | null> {
  const item = await prisma.articles.findUnique({ where: { slug }, include: {
    products: { select: { name: true, slug: true, is_active: true, is_indexed: true } }
  } });
  if (!item) return null;
  const title = item.seo_title?.trim() || `${item.title} | ${BRAND}`;
  const description = plain(item.seo_description) || plain(item.excerpt) || plain(item.content) || item.title;
  const canonical = SITE + pathname;
  const crumbs = breadcrumbs([{ name: "Главная", path: "/" }, { name: "Статьи", path: "/articles" }, { name: item.title, path: pathname }]);
  const product = item.products?.is_active && item.products.is_indexed ? item.products : null;
  const published = item.published_at ?? item.created_at;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: item.title.slice(0, 110),
    description,
    image: item.cover_url ? [item.cover_url] : undefined,
    datePublished: published.toISOString(),
    dateModified: item.updated_at.toISOString(),
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: BRAND, url: SITE },
    publisher: { "@type": "Organization", name: BRAND, logo: { "@type": "ImageObject", url: LOGO } },
    about: product ? { "@type": "Product", name: product.name, url: `${SITE}/products/${encodeURIComponent(product.slug)}` } : undefined
  };
  const body = [
    crumbs.html,
    `<article><h1>${esc(item.title)}</h1>`,
    `<p><time datetime="${esc(published.toISOString())}">${esc(published.toLocaleDateString("ru-RU"))}</time></p>`,
    item.cover_url ? `<img src="${esc(item.cover_url)}" alt="${esc(item.cover_alt || item.title)}" />` : "",
    item.excerpt ? `<p>${esc(item.excerpt)}</p>` : "",
    paragraphs(item.content),
    product ? `<p><a href="/products/${encodeURIComponent(product.slug)}">${esc(item.cta_text || `Купить ${product.name}`)}</a></p>` : "",
    `<p><a href="/articles">Все статьи о чае</a></p></article>`
  ].join("\n");
  return {
    title, description, canonical, body, image: item.cover_url, ogType: "article",
    indexed: item.status === "published" && (!item.published_at || item.published_at <= new Date()),
    jsonLd: [articleLd, crumbs.jsonLd]
  };
}

/** Главная и списковые страницы. */
async function staticPage(pathname: string): Promise<Page | null> {
  const page = (title: string, description: string, body: string, jsonLd: object[] = []): Page => ({
    title, description, body, jsonLd, canonical: SITE + pathname, indexed: true, ogType: "website"
  });
  const now = new Date();
  const categoryLinks = async () => {
    const categories = await prisma.categories.findMany({ where: { is_visible: true, is_indexed: true }, orderBy: { sort_order: "asc" }, select: { name: true, slug: true } });
    return categories.length ? `<section><h2>Каталог чая</h2><ul>${categories.map((category) =>
      `<li><a href="/catalog/${encodeURIComponent(category.slug)}">${esc(category.name)}</a></li>`).join("")}</ul></section>` : "";
  };

  switch (pathname) {
    case "/": {
      const products = await prisma.products.findMany({ where: visibleProduct, orderBy: { created_at: "desc" }, take: 30, select: productCardSelect });
      const list = productList("Чай в магазине", products);
      return page(
        `${BRAND} — интернет-магазин чая с доставкой по России`,
        "Китайские пуэры и улуны, тайваньская ГАБА, редкие сорта и чайная смола. Подберите чай по вкусу и закажите с доставкой по России.",
        [`<h1>${BRAND} — интернет-магазин чая</h1>`, await categoryLinks(), list.html,
          `<p><a href="/articles">Статьи о чае</a> · <a href="/collections">Подборки</a> · <a href="/contacts">Контакты</a></p>`].join("\n"),
        [{ "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: SITE },
          { "@context": "https://schema.org", "@type": "Organization", name: BRAND, url: SITE, logo: LOGO },
          ...(list.jsonLd ? [list.jsonLd] : [])]
      );
    }
    case "/catalog": {
      const crumbs = breadcrumbs([{ name: "Главная", path: "/" }, { name: "Каталог", path: "/catalog" }]);
      return page(`Каталог чая — купить чай онлайн | ${BRAND}`, "Каталог чая: пуэры, улуны, ГАБА, красный и зелёный чай. Цены, описания, доставка по России.",
        [crumbs.html, "<h1>Каталог чая</h1>", await categoryLinks()].join("\n"), [crumbs.jsonLd]);
    }
    case "/new": {
      const products = await prisma.products.findMany({ where: { ...visibleProduct, is_new: true }, orderBy: { created_at: "desc" }, take: 100, select: productCardSelect });
      const list = productList("Новинки", products);
      return page(`Новинки чая | ${BRAND}`, "Новые поступления чая в магазине Чайный Маркет.", ["<h1>Новинки</h1>", list.html].join("\n"), list.jsonLd ? [list.jsonLd] : []);
    }
    case "/collections": {
      const collections = await prisma.collections.findMany({ where: { is_active: true, is_indexed: true,
        AND: [{ OR: [{ starts_at: null }, { starts_at: { lte: now } }] }, { OR: [{ ends_at: null }, { ends_at: { gte: now } }] }] },
      orderBy: { sort_order: "asc" }, select: { name: true, slug: true } });
      return page(`Подборки чая | ${BRAND}`, "Тематические подборки чая: для начинающих, в подарок, по вкусу и эффекту.",
        ["<h1>Подборки чая</h1>", `<ul>${collections.map((item) => `<li><a href="/collections/${encodeURIComponent(item.slug)}">${esc(item.name)}</a></li>`).join("")}</ul>`].join("\n"));
    }
    case "/articles": {
      const articles = await prisma.articles.findMany({ where: { status: "published", OR: [{ published_at: null }, { published_at: { lte: now } }] },
        orderBy: [{ published_at: "desc" }, { created_at: "desc" }], select: { title: true, slug: true, excerpt: true } });
      return page(`Статьи о чае | ${BRAND}`, "Статьи о чае: сорта, заваривание, свойства и чайная культура.",
        ["<h1>Статьи о чае</h1>", `<ul>${articles.map((item) => `<li><a href="/articles/${encodeURIComponent(item.slug)}">${esc(item.title)}</a> — ${esc(plain(item.excerpt, 200))}</li>`).join("")}</ul>`].join("\n"));
    }
    case "/contacts":
      return page(`Контакты | ${BRAND}`, "Контакты интернет-магазина Чайный Маркет: как связаться, доставка и оплата.", "<h1>Контакты</h1>");
    case "/legal/offer":
      return page(`Публичная оферта | ${BRAND}`, "Публичная оферта интернет-магазина Чайный Маркет.", "<h1>Публичная оферта</h1>");
    default:
      return null;
  }
}

/** Убирает из шаблона мета-теги главной страницы, чтобы на странице не было двух canonical/description. */
function stripTemplateSeo(template: string): string {
  return template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<meta\s+(?:name|property)="(?:description|robots|yandex|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
}

function render(template: string, page: Page): string {
  const title = normalizeBrand(page.title);
  const description = normalizeBrand(page.description);
  const robots = page.indexed ? "index, follow, max-image-preview:large" : "noindex, follow";
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(page.canonical)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta property="og:type" content="${page.ogType}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(page.canonical)}" />`,
    `<meta property="og:image" content="${esc(page.image || LOGO)}" />`,
    `<meta name="twitter:card" content="${page.image ? "summary_large_image" : "summary"}" />`,
    // "<" экранируется, чтобы текст из базы не мог закрыть тег <script>.
    ...page.jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`)
  ].join("\n    ");
  const stripped = stripTemplateSeo(template);
  if (!/<\/head>/i.test(stripped) || !/<div id="root"><\/div>/.test(stripped)) {
    throw new Error("SEO HTML template has no </head> or empty #root");
  }
  return stripped
    .replace(/<html\s+lang="en"/i, '<html lang="ru"')
    .replace(/<\/head>/i, `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', () => `<div id="root"><main class="seo-prerender">\n${page.body}\n</main></div>`);
}

router.get("/html", async (req, res, next) => {
  try {
    const original = req.get("X-Original-URI");
    if (!original || !original.startsWith("/") || original.startsWith("//")) {
      res.sendStatus(400);
      return;
    }
    const pathname = new URL(original, SITE).pathname.replace(/(.)\/$/, "$1");
    const match = /^\/(products|catalog|collections|articles)\/([^/]+)$/.exec(pathname);

    let page: Page | null;
    if (match) {
      let slug: string;
      try { slug = decodeURIComponent(match[2]!); } catch { res.sendStatus(400); return; }
      if (!slug || slug.length > 255 || slug.includes("/")) { res.sendStatus(400); return; }
      const loaders = { products: productPage, catalog: categoryPage, collections: collectionPage, articles: articlePage } as const;
      page = await loaders[match[1] as keyof typeof loaders](slug, pathname);
    } else {
      page = await staticPage(pathname);
    }

    if (!page) {
      // Отдаём SPA со статусом 404, чтобы React показал страницу «не найдено».
      const template = stripTemplateSeo(await htmlTemplate())
        .replace(/<\/head>/i, `    <title>Страница не найдена | ${BRAND}</title>\n    <meta name="robots" content="noindex, follow" />\n  </head>`);
      res.set("X-Robots-Tag", "noindex, follow");
      res.set("Cache-Control", "no-store");
      res.type("html").status(404).send(template);
      return;
    }

    if (!page.indexed) res.set("X-Robots-Tag", "noindex, follow");
    res.set("Cache-Control", "no-store");
    res.type("html").status(200).send(render(await htmlTemplate(), page));
  } catch (error) { next(error); }
});

export default router;
