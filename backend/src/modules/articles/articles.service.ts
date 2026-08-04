import {
  Prisma
} from "../../generated/prisma/client.js";

import { prisma } from "../../database/prisma.js";

export type ArticleListRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string | null;
  reading_time_minutes: number;
  is_featured: boolean;
  sort_order: number;
  published_at: Date | null;
};

export type ArticleDetailsRecord =
  ArticleListRecord & {
    content: string;
    status: string;
    seo_title: string | null;
    seo_description: string | null;
    created_at: Date;
    updated_at: Date;
  };

export async function getPublishedArticles(
  featuredOnly = false
): Promise<ArticleListRecord[]> {
  const featuredFilter = featuredOnly
    ? Prisma.sql`AND is_featured = true`
    : Prisma.empty;

  return prisma.$queryRaw<ArticleListRecord[]>(
    Prisma.sql`
      SELECT
        id,
        slug,
        title,
        excerpt,
        cover_url,
        cover_alt,
        reading_time_minutes,
        is_featured,
        sort_order,
        published_at
      FROM articles
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
        ${featuredFilter}
      ORDER BY sort_order ASC,
        published_at DESC
    `
  );
}

export async function getPublishedArticleBySlug(
  slug: string
): Promise<ArticleDetailsRecord | null> {
  const rows =
    await prisma.$queryRaw<ArticleDetailsRecord[]>(
      Prisma.sql`
        SELECT
          id,
          slug,
          title,
          excerpt,
          content,
          cover_url,
          cover_alt,
          reading_time_minutes,
          status,
          is_featured,
          sort_order,
          published_at,
          seo_title,
          seo_description,
          created_at,
          updated_at
        FROM articles
        WHERE slug = ${slug}
          AND status = 'published'
          AND published_at IS NOT NULL
          AND published_at <= now()
        LIMIT 1
      `
    );

  return rows[0] ?? null;
}
