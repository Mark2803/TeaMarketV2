import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();
const SITE = "https://tea-master-team.ru";

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char] ?? char);

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

router.get("/html", async (req, res, next) => {
  try {
    const original = req.get("X-Original-URI");
    if (!original || !original.startsWith("/") || original.startsWith("//")) {
      res.sendStatus(400);
      return;
    }
    const pathname = new URL(original, SITE).pathname;
    const match = /^\/(products|catalog|collections|articles)\/([^/]+)\/?$/.exec(pathname);
    if (!match) { res.sendStatus(404); return; }
    let slug: string;
    try { slug = decodeURIComponent(match[2]!); } catch { res.sendStatus(400); return; }
    if (!slug || slug.length > 255 || slug.includes("/")) { res.sendStatus(400); return; }

    const kind = match[1]!;
    let title = "";
    let description = "";
    let customCanonical: string | null = null;
    let indexed = false;
    let found = false;

    if (kind === "products") {
      const item = await prisma.products.findUnique({ where: { slug }, select: {
        name: true, short_description: true, seo_title: true, seo_description: true,
        canonical_url: true, is_active: true
      } });
      if (item) {
        found = true;
        title = item.seo_title?.trim() || item.name;
        description = item.seo_description?.trim() || item.short_description?.trim() || title;
        customCanonical = item.canonical_url;
        indexed = item.is_active;
      }
    } else if (kind === "catalog") {
      const item = await prisma.categories.findUnique({ where: { slug }, select: {
        name: true, description: true, seo_title: true, seo_description: true,
        canonical_url: true, is_visible: true
      } });
      if (item) {
        found = true;
        title = item.seo_title?.trim() || item.name;
        description = item.seo_description?.trim() || item.description?.trim() || title;
        customCanonical = item.canonical_url;
        indexed = item.is_visible;
      }
    } else if (kind === "collections") {
      const item = await prisma.collections.findUnique({ where: { slug }, select: {
        name: true, description: true, seo_title: true, seo_description: true,
        canonical_url: true, is_active: true, starts_at: true, ends_at: true
      } });
      if (item) {
        found = true;
        title = item.seo_title?.trim() || item.name;
        description = item.seo_description?.trim() || item.description?.trim() || title;
        customCanonical = item.canonical_url;
        const now = new Date();
        indexed = item.is_active && (!item.starts_at || item.starts_at <= now) && (!item.ends_at || item.ends_at >= now);
      }
    } else {
      const item = await prisma.articles.findUnique({ where: { slug }, select: {
        title: true, excerpt: true, seo_title: true, seo_description: true, status: true, published_at: true
      } });
      if (item) {
        found = true;
        title = item.seo_title?.trim() || item.title;
        description = item.seo_description?.trim() || item.excerpt.trim() || title;
        indexed = item.status === "published" && (!item.published_at || item.published_at <= new Date());
      }
    }

    if (!found) { res.set("X-Robots-Tag", "noindex, follow"); res.sendStatus(404); return; }
    const canonical = canonicalUrl(customCanonical, pathname.replace(/\/$/, ""));
    const meta = [
      `<title>${escapeHtml(title)}</title>`,
      `<meta name="description" content="${escapeHtml(description)}" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<meta name="robots" content="${indexed ? "index, follow" : "noindex, follow"}" />`,
      `<meta name="yandex" content="${indexed ? "index, follow" : "noindex, follow"}" />`
    ].join("\n    ");
    const template = await htmlTemplate();
    if (!/<title\b[^>]*>[\s\S]*?<\/title>/i.test(template)) throw new Error("SEO HTML template has no title element");
    const html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, meta).replace(/<html\s+lang="en"/i, '<html lang="ru"');
    if (!indexed) res.set("X-Robots-Tag", "noindex, follow");
    res.set("Cache-Control", "no-store");
    res.type("html").status(200).send(html);
  } catch (error) { next(error); }
});

export default router;
