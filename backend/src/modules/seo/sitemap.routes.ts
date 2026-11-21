import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();
const SITE = "https://tea-master-team.ru";
const xmlEscape = (value: string): string => value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch] ?? ch);
const iso = (value: Date): string => value.toISOString();

router.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const now = new Date();
    const [products, categories, collections, articles] = await Promise.all([
      prisma.products.findMany({ where: { is_active: true, is_indexed: true }, select: { slug: true, updated_at: true, name: true, product_images: { orderBy: [{ sort_order: "asc" }, { id: "asc" }], take: 10, select: { image_url: true } } } }),
      prisma.categories.findMany({ where: { is_visible: true, is_indexed: true }, select: { slug: true, updated_at: true } }),
      prisma.collections.findMany({ where: { is_active: true, is_indexed: true, AND: [{ OR: [{ starts_at: null }, { starts_at: { lte: now } }] }, { OR: [{ ends_at: null }, { ends_at: { gte: now } }] }] }, select: { slug: true, updated_at: true } }),
      // is_indexed добавлен миграцией 340_article_indexing (не в Prisma-клиенте).
      prisma.$queryRaw<Array<{ slug: string; updated_at: Date }>>`SELECT slug, updated_at FROM articles WHERE status = 'published' AND is_indexed = true AND (published_at IS NULL OR published_at <= ${now})`
    ]);
    const urls: Array<{ path: string; lastmod?: Date; images?: string[] }> = [
      { path: "/" }, { path: "/catalog" }, { path: "/collections" }, { path: "/articles" }, { path: "/new" }, { path: "/contacts" }, { path: "/legal/offer" },
      { path: "/tools/" }, { path: "/tools/wildberries-barcode-generator/" }, { path: "/tools/gtin14-generator/" },
      ...products.map((item) => ({ path: `/products/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at, images: item.product_images.map((image) => image.image_url) })),
      ...categories.map((item) => ({ path: `/catalog/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
      ...collections.map((item) => ({ path: `/collections/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
      ...articles.map((item) => ({ path: `/articles/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.map(({ path, lastmod, images }) => `  <url><loc>${xmlEscape(SITE + path)}</loc>${lastmod ? `<lastmod>${iso(lastmod)}</lastmod>` : ""}${(images ?? []).map((url) => `<image:image><image:loc>${xmlEscape(url)}</image:loc></image:image>`).join("")}</url>`).join("\n")}\n</urlset>\n`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.status(200).send(xml);
  } catch (error) { next(error); }
});

export default router;
