import { Router } from "express";
import { prisma } from "../../database/prisma.js";

/**
 * Товарные фиды:
 *  - /api/seo/yandex-feed.xml — YML для Яндекс Товаров / Яндекс Бизнеса;
 *  - /api/seo/google-feed.xml — RSS 2.0 для Google Merchant Center.
 * Одно предложение = один вариант (вес) товара. В фид попадают только активные
 * и индексируемые товары с ценой и хотя бы одной фотографией.
 */
const router = Router();
const SITE = "https://tea-master-team.ru";
const BRAND = "Чайный Маркет";

const xml = (value: unknown): string => String(value ?? "")
  // Удаляем управляющие символы, недопустимые в XML.
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch] ?? ch);

const plain = (value: string | null | undefined, max: number): string => {
  const text = (value ?? "").replace(/^##\s+/gm, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text;
};

/** id предложения: латиница и цифры, до 20 символов (требование YML). */
const offerId = (sku: string, fallback: string): string => {
  const clean = sku.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
  return clean || fallback.replace(/-/g, "").slice(0, 20);
};

const weightLabel = (grams: number): string => grams >= 1000 ? `${grams / 1000} кг` : `${grams} г`;

async function loadOffers() {
  const [products, categories] = await Promise.all([
    prisma.products.findMany({
      where: { is_active: true, is_indexed: true },
      orderBy: { created_at: "asc" },
      include: {
        product_images: { orderBy: [{ sort_order: "asc" }, { id: "asc" }], take: 10 },
        product_variants: { where: { status: "active" }, orderBy: [{ sort_order: "asc" }, { weight_g: "asc" }] },
        product_categories: { orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }], take: 1, include: { categories: true } }
      }
    }),
    prisma.categories.findMany({ where: { is_visible: true }, orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parent_category_id: true } })
  ]);

  // В YML id категорий — целые числа.
  const categoryNumber = new Map(categories.map((category, index) => [category.id, index + 1]));

  const offers = products.flatMap((product) => {
    const images = product.product_images.map((image) => image.image_url);
    if (!images.length) return [];
    const category = product.product_categories[0]?.categories;
    const url = `${SITE}/products/${encodeURIComponent(product.slug)}`;
    const description = plain(product.short_description || product.about_tea || product.seo_description || product.name, 3000);
    const params: Array<[string, string]> = ([
      ["Вид чая", product.tea_type], ["Страна", product.country], ["Регион", product.region],
      ["Ферментация", product.fermentation_level], ["Форма", product.product_form],
      ["Вкус", product.taste], ["Аромат", product.aroma]
    ] as Array<[string, string | null]>).filter((row): row is [string, string] => Boolean(row[1]?.trim()));

    return product.product_variants
      .filter((variant) => Number(variant.price) > 0)
      .map((variant) => {
        const grams = Number(variant.weight_g);
        const shipping = Number(variant.shipping_weight_g ?? variant.weight_g);
        const dims = [variant.package_length_cm, variant.package_width_cm, variant.package_height_cm];
        return {
          id: offerId(variant.sku, variant.id),
          groupId: product.id,
          name: `${product.name}, ${weightLabel(grams)}`,
          url,
          price: Number(variant.price),
          oldPrice: variant.old_price && Number(variant.old_price) > Number(variant.price) ? Number(variant.old_price) : null,
          available: variant.is_available && variant.stock_quantity > 0,
          images,
          description,
          vendor: product.manufacturer?.trim() || BRAND,
          categoryId: category ? categoryNumber.get(category.id) ?? null : null,
          categoryName: category?.name ?? product.tea_type ?? "Чай",
          weightKg: shipping > 0 ? shipping / 1000 : null,
          dimensions: dims.every((value) => value && Number(value) > 0) ? dims.map(Number).join("/") : null,
          params: [...params, ["Вес", weightLabel(grams)] as [string, string]]
        };
      });
  });

  return {
    offers,
    categories: categories.map((category) => ({
      id: categoryNumber.get(category.id)!,
      parentId: category.parent_category_id ? categoryNumber.get(category.parent_category_id) ?? null : null,
      name: category.name
    }))
  };
}

const sendXml = (res: import("express").Response, body: string) => {
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=900");
  res.status(200).send(body);
};

router.get("/yandex-feed.xml", async (_req, res, next) => {
  try {
    const { offers, categories } = await loadOffers();
    const date = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${date}">
  <shop>
    <name>${xml(BRAND)}</name>
    <company>${xml(BRAND)}</company>
    <url>${SITE}/</url>
    <currencies><currency id="RUR" rate="1"/></currencies>
    <categories>
${categories.map((category) => `      <category id="${category.id}"${category.parentId ? ` parentId="${category.parentId}"` : ""}>${xml(category.name)}</category>`).join("\n")}
    </categories>
    <offers>
${offers.map((offer) => `      <offer id="${xml(offer.id)}" available="${offer.available}">
        <name>${xml(offer.name)}</name>
        <vendor>${xml(offer.vendor)}</vendor>
        <url>${xml(offer.url)}</url>
        <price>${offer.price}</price>
${offer.oldPrice ? `        <oldprice>${offer.oldPrice}</oldprice>\n` : ""}        <currencyId>RUR</currencyId>
${offer.categoryId ? `        <categoryId>${offer.categoryId}</categoryId>\n` : ""}${offer.images.map((url) => `        <picture>${xml(url)}</picture>`).join("\n")}
        <delivery>true</delivery>
        <description>${xml(offer.description)}</description>
${offer.weightKg ? `        <weight>${offer.weightKg}</weight>\n` : ""}${offer.dimensions ? `        <dimensions>${offer.dimensions}</dimensions>\n` : ""}${offer.params.map(([name, value]) => `        <param name="${xml(name)}">${xml(value)}</param>`).join("\n")}
      </offer>`).join("\n")}
    </offers>
  </shop>
</yml_catalog>
`;
    sendXml(res, body);
  } catch (error) { next(error); }
});

router.get("/google-feed.xml", async (_req, res, next) => {
  try {
    const { offers } = await loadOffers();
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(BRAND)}</title>
    <link>${SITE}/</link>
    <description>Интернет-магазин чая ${xml(BRAND)}</description>
${offers.map((offer) => `    <item>
      <g:id>${xml(offer.id)}</g:id>
      <g:item_group_id>${xml(offer.groupId)}</g:item_group_id>
      <g:title>${xml(offer.name.slice(0, 150))}</g:title>
      <g:description>${xml(offer.description.slice(0, 5000))}</g:description>
      <g:link>${xml(offer.url)}</g:link>
      <g:image_link>${xml(offer.images[0])}</g:image_link>
${offer.images.slice(1).map((url) => `      <g:additional_image_link>${xml(url)}</g:additional_image_link>`).join("\n")}
      <g:availability>${offer.available ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${(offer.oldPrice ?? offer.price).toFixed(2)} RUB</g:price>
${offer.oldPrice ? `      <g:sale_price>${offer.price.toFixed(2)} RUB</g:sale_price>\n` : ""}      <g:condition>new</g:condition>
      <g:brand>${xml(offer.vendor)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>2073</g:google_product_category>
      <g:product_type>${xml(offer.categoryName)}</g:product_type>
${offer.weightKg ? `      <g:shipping_weight>${offer.weightKg} kg</g:shipping_weight>\n` : ""}    </item>`).join("\n")}
  </channel>
</rss>
`;
    sendXml(res, body);
  } catch (error) { next(error); }
});

export default router;
