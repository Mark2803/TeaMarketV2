import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/prisma.js";

export type ArticleListRecord = {
  id:string; slug:string; title:string; excerpt:string; cover_url:string|null; cover_alt:string|null;
  reading_time_minutes:number; is_featured:boolean; sort_order:number; published_at:Date|null;
};
export type ArticleDetailsRecord = ArticleListRecord & {
  content:string; status:string; seo_title:string|null; seo_description:string|null; created_at:Date; updated_at:Date;
  linked_product_id:string|null; cta_text:string|null; linked_product:{id:string;name:string;slug:string;image_url:string|null}|null;
};

const websiteVisibility = Prisma.sql`AND NOT EXISTS (
  SELECT 1 FROM article_publications apw
  WHERE apw.article_id=a.id AND apw.channel='website' AND apw.enabled=false
)`;

export async function getPublishedArticles(featuredOnly=false):Promise<ArticleListRecord[]>{
  const featuredFilter=featuredOnly?Prisma.sql`AND a.is_featured = true`:Prisma.empty;
  return prisma.$queryRaw<ArticleListRecord[]>(Prisma.sql`
    SELECT a.id,a.slug,a.title,a.excerpt,a.cover_url,a.cover_alt,a.reading_time_minutes,a.is_featured,a.sort_order,a.published_at
    FROM articles a
    WHERE a.status='published' AND a.published_at IS NOT NULL AND a.published_at<=now()
      ${websiteVisibility} ${featuredFilter}
    ORDER BY a.sort_order ASC,a.published_at DESC
  `);
}

export async function getPublishedArticleBySlug(slug:string):Promise<ArticleDetailsRecord|null>{
  const rows=await prisma.$queryRaw<ArticleDetailsRecord[]>(Prisma.sql`
    SELECT a.id,a.slug,a.title,a.excerpt,a.content,a.cover_url,a.cover_alt,a.reading_time_minutes,a.status,a.is_featured,a.sort_order,a.published_at,a.seo_title,a.seo_description,a.created_at,a.updated_at,a.linked_product_id,a.cta_text,
      CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object(
        'id',p.id,'name',p.name,'slug',p.slug,
        'image_url',(SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order ASC LIMIT 1)
      ) END AS linked_product
    FROM articles a LEFT JOIN products p ON p.id=a.linked_product_id
    WHERE a.slug=${slug} AND a.status='published' AND a.published_at IS NOT NULL AND a.published_at<=now()
      ${websiteVisibility}
    LIMIT 1
  `);
  return rows[0]??null;
}

export type DzenArticleRecord = ArticleDetailsRecord;
export async function getDzenArticles():Promise<DzenArticleRecord[]>{
  return prisma.$queryRaw<DzenArticleRecord[]>(Prisma.sql`
    SELECT a.id,a.slug,a.title,a.excerpt,a.content,a.cover_url,a.cover_alt,a.reading_time_minutes,a.status,a.is_featured,a.sort_order,a.published_at,a.seo_title,a.seo_description,a.created_at,a.updated_at,a.linked_product_id,a.cta_text,
      CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object(
        'id',p.id,'name',p.name,'slug',p.slug,
        'image_url',(SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.sort_order ASC LIMIT 1)
      ) END AS linked_product
    FROM articles a
    JOIN article_publications ap ON ap.article_id=a.id AND ap.channel='dzen' AND ap.enabled=true
    LEFT JOIN products p ON p.id=a.linked_product_id
    WHERE a.status='published' AND a.published_at IS NOT NULL AND a.published_at<=now()
    ORDER BY a.published_at DESC
    LIMIT 500
  `);
}
