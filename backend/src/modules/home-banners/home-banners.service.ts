import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/prisma.js";

export type HomeBannerRecord = {
  id: string; eyebrow: string | null; title: string; subtitle: string | null;
  image_url: string | null; image_alt: string | null; sort_order: number;
  collections: { id: string; slug: string; name: string; description: string | null };
};

export async function getActiveHomeBanners(): Promise<HomeBannerRecord[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string; eyebrow: string | null; title: string; subtitle: string | null;
    image_url: string | null; image_alt: string | null; sort_order: number;
    collection_id: string; collection_slug: string; collection_name: string; collection_description: string | null;
  }>>(Prisma.sql`
    SELECT hb.id, hb.eyebrow, hb.title, hb.subtitle, hb.image_url, hb.image_alt, hb.sort_order,
           c.id AS collection_id, c.slug AS collection_slug, c.name AS collection_name, c.description AS collection_description
    FROM home_banners hb
    JOIN collections c ON c.id = hb.collection_id
    WHERE hb.is_active = true
      AND c.is_active = true
      AND (hb.starts_at IS NULL OR hb.starts_at <= now())
      AND (hb.ends_at IS NULL OR hb.ends_at >= now())
    ORDER BY hb.sort_order ASC, hb.created_at ASC
  `);
  return rows.map((row) => ({
    id: row.id, eyebrow: row.eyebrow, title: row.title, subtitle: row.subtitle,
    image_url: row.image_url, image_alt: row.image_alt, sort_order: row.sort_order,
    collections: { id: row.collection_id, slug: row.collection_slug, name: row.collection_name, description: row.collection_description }
  }));
}
