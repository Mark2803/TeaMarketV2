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

export async function listModeratorArticles(){ return prisma.articles.findMany({orderBy:[{sort_order:"asc"},{updated_at:"desc"}]}); }
export async function createModeratorArticle(input:any){ return prisma.articles.create({data:{slug:input.slug,title:input.title,excerpt:input.excerpt,content:input.content,cover_url:input.coverUrl??null,cover_alt:input.coverAlt??null,reading_time_minutes:input.readingTimeMinutes,status:input.status,is_featured:input.isFeatured,sort_order:input.sortOrder,published_at:input.status==="published"?(input.publishedAt??new Date()):(input.publishedAt??null),seo_title:input.seoTitle??null,seo_description:input.seoDescription??null}}); }
export async function updateModeratorArticle(id:string,input:any){ const data:any={}; const map:any={slug:"slug",title:"title",excerpt:"excerpt",content:"content",coverUrl:"cover_url",coverAlt:"cover_alt",readingTimeMinutes:"reading_time_minutes",status:"status",isFeatured:"is_featured",sortOrder:"sort_order",publishedAt:"published_at",seoTitle:"seo_title",seoDescription:"seo_description"}; for(const [k,v] of Object.entries(input)) if(v!==undefined) data[map[k]]=v; if(input.status==="published" && input.publishedAt===undefined) { const old=await prisma.articles.findUnique({where:{id},select:{published_at:true}}); if(!old?.published_at)data.published_at=new Date(); } return prisma.articles.update({where:{id},data:{...data,updated_at:new Date()}}); }
export async function deleteModeratorArticle(id:string){ return prisma.articles.delete({where:{id}}); }
