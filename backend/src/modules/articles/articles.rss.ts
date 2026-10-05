import type { DzenArticleRecord } from "./articles.service.js";

const SITE_URL="https://tea-master-team.ru";
const xml=(v:string)=>v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const html=(v:string)=>v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const cdata=(v:string)=>v.replace(/]]>/g,"]]&gt;");

function contentToHtml(content:string){
  return content.split(/\n\s*\n/).map(block=>{
    const value=block.trim();
    if(!value)return "";
    if(value.startsWith("## "))return `<h2>${html(value.slice(3))}</h2>`;
    return `<p>${html(value).replace(/\n/g,"<br>")}</p>`;
  }).join("\n");
}
function mime(url:string){const x=url.toLowerCase().split("?")[0] ?? "";if(x.endsWith(".png"))return "image/png";if(x.endsWith(".gif"))return "image/gif";return "image/jpeg";}
export function buildDzenRss(items:DzenArticleRecord[]){
  const body=items.map(a=>{
    const articleUrl=`${SITE_URL}/articles/${encodeURIComponent(a.slug)}`;
    const productUrl=a.linked_product?`${SITE_URL}/products/${encodeURIComponent(a.linked_product.slug)}`:null;
    const cta=productUrl?`<h2>Попробовать этот чай</h2><p><a href="${productUrl}">${html(a.cta_text?.trim()||`Посмотреть ${a.linked_product!.name} и выбрать вес`)}</a></p>`:"";
    const enclosure=a.cover_url?`<enclosure url="${xml(a.cover_url)}" type="${mime(a.cover_url)}"/>`:"";
    return `<item>
<title>${xml(a.title)}</title>
<link>${xml(articleUrl)}</link>
<guid isPermaLink="false">${xml(a.id)}</guid>
<pubDate>${(a.published_at??a.created_at).toUTCString()}</pubDate>
<category>format-article</category><category>index</category><category>comment-all</category>
${enclosure}
<description>${xml(a.excerpt)}</description>
<content:encoded><![CDATA[${cdata(`<h1>${html(a.title)}</h1>${contentToHtml(a.content)}${cta}`)}]]></content:encoded>
</item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Чайный Мастер — статьи о чае</title><link>${SITE_URL}/articles</link><language>ru</language><description>Статьи о китайском, тайваньском и вьетнамском чае</description>
${body}
</channel></rss>`;
}
