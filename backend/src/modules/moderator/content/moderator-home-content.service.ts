import { prisma } from "../../../database/prisma.js";

export async function listModeratorHomeBanners() {
  return prisma.home_banners.findMany({ orderBy:[{sort_order:"asc"},{created_at:"asc"}], include:{collections:{select:{id:true,name:true,slug:true}}} });
}
export async function createModeratorHomeBanner(input:any) {
  return prisma.home_banners.create({data:{collection_id:input.collectionId,eyebrow:input.eyebrow??null,title:input.title,subtitle:input.subtitle??null,image_url:input.imageUrl??null,image_alt:input.imageAlt??null,is_active:input.isActive,sort_order:input.sortOrder,starts_at:input.startsAt??null,ends_at:input.endsAt??null},include:{collections:{select:{id:true,name:true,slug:true}}}});
}
export async function updateModeratorHomeBanner(id:string,input:any) {
  const data:any={};
  const map:any={collectionId:"collection_id",eyebrow:"eyebrow",title:"title",subtitle:"subtitle",imageUrl:"image_url",imageAlt:"image_alt",isActive:"is_active",sortOrder:"sort_order",startsAt:"starts_at",endsAt:"ends_at"};
  for(const [k,v] of Object.entries(input)) if(v!==undefined) data[map[k]]=v;
  return prisma.home_banners.update({where:{id},data:{...data,updated_at:new Date()},include:{collections:{select:{id:true,name:true,slug:true}}}});
}
export async function deleteModeratorHomeBanner(id:string){ return prisma.home_banners.delete({where:{id}}); }

type PublicationChannel = "website" | "dzen" | "telegram" | "vk";

async function syncArticlePublications(articleId:string, channels:PublicationChannel[]|undefined){
  if(!channels) return;
  const supported:PublicationChannel[]=["website","dzen","telegram","vk"];
  for(const channel of supported){
    const enabled=channels.includes(channel);
    await prisma.$executeRaw`
      INSERT INTO article_publications (article_id, channel, enabled, status, updated_at)
      VALUES (${articleId}::uuid, ${channel}, ${enabled}, 'pending', now())
      ON CONFLICT (article_id, channel)
      DO UPDATE SET enabled=EXCLUDED.enabled, status=CASE WHEN article_publications.enabled IS DISTINCT FROM EXCLUDED.enabled THEN 'pending' ELSE article_publications.status END, updated_at=now()
    `;
  }
}

async function applyArticleDistribution(articleId:string,input:any){
  if(input.linkedProductId!==undefined || input.ctaText!==undefined){
    await prisma.$executeRaw`
      UPDATE articles SET
        linked_product_id = CASE WHEN ${input.linkedProductId===undefined} THEN linked_product_id ELSE ${input.linkedProductId}::uuid END,
        cta_text = CASE WHEN ${input.ctaText===undefined} THEN cta_text ELSE ${input.ctaText} END,
        updated_at = now()
      WHERE id=${articleId}::uuid
    `;
  }
  await syncArticlePublications(articleId,input.publishChannels);
}

export async function listModeratorArticles(){
  return prisma.$queryRaw<any[]>`
    SELECT a.*,
      CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id',p.id,'name',p.name,'slug',p.slug) END AS linked_product,
      COALESCE((SELECT json_agg(ap.channel ORDER BY ap.channel) FROM article_publications ap WHERE ap.article_id=a.id AND ap.enabled=true),'[]'::json) AS publish_channels
    FROM articles a
    LEFT JOIN products p ON p.id=a.linked_product_id
    ORDER BY a.sort_order ASC,a.updated_at DESC
  `;
}
export async function createModeratorArticle(input:any){
  const article=await prisma.articles.create({data:{slug:input.slug,title:input.title,excerpt:input.excerpt,content:input.content,cover_url:input.coverUrl??null,cover_alt:input.coverAlt??null,reading_time_minutes:input.readingTimeMinutes,status:input.status,is_featured:input.isFeatured,sort_order:input.sortOrder,published_at:input.status==="published"?(input.publishedAt??new Date()):(input.publishedAt??null),seo_title:input.seoTitle??null,seo_description:input.seoDescription??null}});
  await applyArticleDistribution(article.id,{...input,publishChannels:input.publishChannels??["website"]});
  return (await listModeratorArticles()).find(x=>x.id===article.id)??article;
}
export async function updateModeratorArticle(id:string,input:any){
  const data:any={}; const map:any={slug:"slug",title:"title",excerpt:"excerpt",content:"content",coverUrl:"cover_url",coverAlt:"cover_alt",readingTimeMinutes:"reading_time_minutes",status:"status",isFeatured:"is_featured",sortOrder:"sort_order",publishedAt:"published_at",seoTitle:"seo_title",seoDescription:"seo_description"};
  for(const [k,v] of Object.entries(input)) if(v!==undefined && map[k]) data[map[k]]=v;
  if(input.status==="published" && input.publishedAt===undefined) { const old=await prisma.articles.findUnique({where:{id},select:{published_at:true}}); if(!old?.published_at)data.published_at=new Date(); }
  if(Object.keys(data).length) await prisma.articles.update({where:{id},data:{...data,updated_at:new Date()}}); else { const exists=await prisma.articles.findUnique({where:{id},select:{id:true}}); if(!exists) throw new Error("ARTICLE_NOT_FOUND"); }
  await applyArticleDistribution(id,input);
  return (await listModeratorArticles()).find(x=>x.id===id);
}
export async function deleteModeratorArticle(id:string){ return prisma.articles.delete({where:{id}}); }
