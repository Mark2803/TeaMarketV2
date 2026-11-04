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
      prisma.products.findMany({ where: { is_active: true, is_indexed: true }, select: { slug: true, updated_at: true } }),
      prisma.categories.findMany({ where: { is_visible: true, is_indexed: true }, select: { slug: true, updated_at: true } }),
      prisma.collections.findMany({ where: { is_active: true, is_indexed: true, AND: [{ OR: [{ starts_at: null }, { starts_at: { lte: now } }] }, { OR: [{ ends_at: null }, { ends_at: { gte: now } }] }] }, select: { slug: true, updated_at: true } }),
      prisma.articles.findMany({ where: { status: "published", OR: [{ published_at: null }, { published_at: { lte: now } }] }, select: { slug: true, updated_at: true } })
    ]);
    const urls: Array<{ path: string; lastmod?: Date }> = [
      { path: "/" }, { path: "/catalog" }, { path: "/collections" }, { path: "/articles" }, { path: "/new" }, { path: "/contacts" }, { path: "/legal/offer" },
      ...products.map((item) => ({ path: `/products/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
      ...categories.map((item) => ({ path: `/catalog/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
      ...collections.map((item) => ({ path: `/collections/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
      ...articles.map((item) => ({ path: `/articles/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at }))
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ path, lastmod }) => `  <url><loc>${xmlEscape(SITE + path)}</loc>${lastmod ? `<lastmod>${iso(lastmod)}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.status(200).send(xml);
  } catch (error) { next(error); }
});

export default router;
