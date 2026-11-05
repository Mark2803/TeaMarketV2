import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();

router.get("/indexing-policy", async (req, res, next) => {
  try {
    const uri = req.get("X-Original-URI");
    if (!uri || !uri.startsWith("/") || uri.startsWith("//")) {
      res.sendStatus(400);
      return;
    }
    const path = new URL(uri, "https://tea-master-team.ru").pathname;
    const match = /^\/(products|catalog|collections)\/([^/]+)\/?$/.exec(path);
    if (!match) {
      res.sendStatus(204);
      return;
    }
    let slug: string;
    try {
      slug = decodeURIComponent(match[2]!);
    } catch {
      res.sendStatus(400);
      return;
    }
    if (!slug || slug.length > 255) {
      res.sendStatus(400);
      return;
    }

    let indexed = false;
    if (match[1] === "products") {
      const item = await prisma.products.findUnique({
        where: { slug },
        select: { is_indexed: true, is_active: true }
      });
      indexed = Boolean(item?.is_indexed && item.is_active);
    } else if (match[1] === "catalog") {
      const item = await prisma.categories.findUnique({
        where: { slug },
        select: { is_indexed: true, is_visible: true }
      });
      indexed = Boolean(item?.is_indexed && item.is_visible);
    } else {
      const item = await prisma.collections.findUnique({
        where: { slug },
        select: { is_indexed: true, is_active: true, starts_at: true, ends_at: true }
      });
      const now = new Date();
      indexed = Boolean(item?.is_indexed && item.is_active
        && (!item.starts_at || item.starts_at <= now)
        && (!item.ends_at || item.ends_at >= now));
    }
    if (!indexed) res.set("X-Robots-Tag", "noindex, follow");
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
