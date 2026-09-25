import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { BookOpen, Images, Layers3, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import {
  addProductToAdminCollection, createAdminArticle, createAdminCollection, createAdminHomeBanner,
  deleteAdminArticle, deleteAdminCollection, deleteAdminHomeBanner, getAdminArticles, getAdminCollection,
  getAdminCollections, getAdminHomeBanners, getAdminProducts, removeProductFromAdminCollection,
  updateAdminArticle, updateAdminCollection, updateAdminHomeBanner, updateAdminProduct,
  type AdminArticle, type AdminCollection, type AdminHomeBanner, type AdminProductListItem
} from "../../shared/api/admin";

type Tab="hero"|"collections"|"new"|"articles";
const translit=(v:string)=>{const m:Record<string,string>={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};return v.toLowerCase().split("").map(c=>m[c]??c).join("").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-+/g,"-")};
const dt=(v:string|null|undefined)=>v?new Date(v).toISOString().slice(0,16):"";
const iso=(v:string)=>v?new Date(v).toISOString():null;

export default function AdminContentPage(){
 const [tab,setTab]=useState<Tab>("hero"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [collections,setCollections]=useState<AdminCollection[]>([]),[banners,setBanners]=useState<AdminHomeBanner[]>([]),[articles,setArticles]=useState<AdminArticle[]>([]),[products,setProducts]=useState<AdminProductListItem[]>([]);
 const reload=async()=>{setError("");try{const [c,b,a,p]=await Promise.all([getAdminCollections(),getAdminHomeBanners(),getAdminArticles(),getAdminProducts({limit:100})]);setCollections(c.data);setBanners(b.data);setArticles(a.data);setProducts(p.data);}catch{setError("Не удалось загрузить данные раздела Контент.")}};
 useEffect(()=>{void reload()},[]);
 return <div className="admin-page admin-content-page"><div className="admin-page-heading"><div><p className="admin-eyebrow">Контент</p><h1>Главная магазина</h1><p>Блоки расположены в порядке управления главной страницей.</p></div></div>
 {error&&<div className="admin-editor-message is-error">{error}</div>}
 <div className="admin-content-tabs">
  <button className={tab==="hero"?"active":""} onClick={()=>setTab("hero")}><Images size={17}/>Hero</button>
  <button className={tab==="collections"?"active":""} onClick={()=>setTab("collections")}><Layers3 size={17}/>Подборки</button>
  <button className={tab==="new"?"active":""} onClick={()=>setTab("new")}><PackagePlus size={17}/>Новинки</button>
  <button className={tab==="articles"?"active":""} onClick={()=>setTab("articles")}><BookOpen size={17}/>Статьи о чае</button>
 </div>
 {tab==="hero"&&<HeroSection items={banners} collections={collections} busy={busy} setBusy={setBusy} reload={reload} setError={setError}/>} 
 {tab==="collections"&&<CollectionsSection items={collections} products={products} busy={busy} setBusy={setBusy} reload={reload} setError={setError}/>} 
 {tab==="new"&&<NewSection products={products} busy={busy} setBusy={setBusy} reload={reload} setError={setError}/>} 
 {tab==="articles"&&<ArticlesSection items={articles} busy={busy} setBusy={setBusy} reload={reload} setError={setError}/>} 
 </div>
}

function HeroSection({items,collections,busy,setBusy,reload,setError}:any){const empty={collectionId:collections[0]?.id??"",eyebrow:"",title:"",subtitle:"",imageUrl:"",imageAlt:"",isActive:true,sortOrder:0,startsAt:"",endsAt:""};const [id,setId]=useState<string|null>(null),[f,setF]=useState<any>(empty);useEffect(()=>{if(!f.collectionId&&collections[0])setF((x:any)=>({...x,collectionId:collections[0].id}))},[collections]);const edit=(x:AdminHomeBanner)=>{setId(x.id);setF({collectionId:x.collection_id,eyebrow:x.eyebrow??"",title:x.title,subtitle:x.subtitle??"",imageUrl:x.image_url??"",imageAlt:x.image_alt??"",isActive:x.is_active,sortOrder:x.sort_order,startsAt:dt(x.starts_at),endsAt:dt(x.ends_at)})};const save=async()=>{setBusy(true);setError("");try{const input={...f,imageUrl:f.imageUrl||null,eyebrow:f.eyebrow||null,subtitle:f.subtitle||null,imageAlt:f.imageAlt||null,sortOrder:Number(f.sortOrder),startsAt:iso(f.startsAt),endsAt:iso(f.endsAt)};id?await updateAdminHomeBanner(id,input):await createAdminHomeBanner(input);setId(null);setF({...empty,collectionId:collections[0]?.id??""});await reload()}catch{setError("Не удалось сохранить Hero. Проверьте обязательные поля и URL изображения.")}finally{setBusy(false)}};return <ContentSplit title="Hero" add={()=>{setId(null);setF({...empty,collectionId:collections[0]?.id??""})}} list={items.map((x:AdminHomeBanner)=><ContentRow key={x.id} title={x.title} meta={`${x.collections.name} · порядок ${x.sort_order} · ${x.is_active?"активен":"скрыт"}`} onEdit={()=>edit(x)} onDelete={async()=>{if(confirm(`Удалить Hero «${x.title}»?`)){await deleteAdminHomeBanner(x.id);await reload()}}}/>)}><div className="admin-form-grid"><Field t="Заголовок *" v={f.title} set={(v)=>setF({...f,title:v})}/><label className="admin-field"><span>Подборка *</span><select value={f.collectionId} onChange={e=>setF({...f,collectionId:e.target.value})}>{collections.map((c:AdminCollection)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Field t="Надзаголовок" v={f.eyebrow} set={(v)=>setF({...f,eyebrow:v})}/><Field t="Порядок" type="number" v={f.sortOrder} set={(v)=>setF({...f,sortOrder:v})}/><Field wide t="Подзаголовок" v={f.subtitle} set={(v)=>setF({...f,subtitle:v})}/><Field wide t="URL изображения" v={f.imageUrl} set={(v)=>setF({...f,imageUrl:v})}/><Field wide t="Alt изображения" v={f.imageAlt} set={(v)=>setF({...f,imageAlt:v})}/><Field t="Начало показа" type="datetime-local" v={f.startsAt} set={(v)=>setF({...f,startsAt:v})}/><Field t="Окончание показа" type="datetime-local" v={f.endsAt} set={(v)=>setF({...f,endsAt:v})}/></div><Check text="Активен" v={f.isActive} set={(v)=>setF({...f,isActive:v})}/><SaveButton busy={busy} onClick={save}/></ContentSplit>}

function CollectionsSection({items,products,busy,setBusy,reload,setError}:any){const empty={name:"",slug:"",description:"",imageUrl:"",isActive:true,showOnHome:true,sortOrder:0,startsAt:"",endsAt:"",seoTitle:"",seoDescription:"",canonicalUrl:"",isIndexed:true};const[id,setId]=useState<string|null>(null),[f,setF]=useState<any>(empty),[memberIds,setMemberIds]=useState<Set<string>>(new Set());const edit=async(x:AdminCollection)=>{setId(x.id);const d=(await getAdminCollection(x.id)).data;setF({name:d.name,slug:d.slug,description:d.description??"",imageUrl:d.imageUrl??"",isActive:d.isActive,showOnHome:d.showOnHome,sortOrder:d.sortOrder,startsAt:dt(d.startsAt),endsAt:dt(d.endsAt),seoTitle:d.seoTitle??"",seoDescription:d.seoDescription??"",canonicalUrl:d.canonicalUrl??"",isIndexed:d.isIndexed});setMemberIds(new Set((d.products??[]).map(p=>p.productId)))};const save=async()=>{setBusy(true);try{const input={...f,description:f.description||null,imageUrl:f.imageUrl||null,collectionType:"manual",automationRules:null,sortOrder:Number(f.sortOrder),startsAt:iso(f.startsAt),endsAt:iso(f.endsAt),seoTitle:f.seoTitle||null,seoDescription:f.seoDescription||null,canonicalUrl:f.canonicalUrl||null};if(id){await updateAdminCollection(id,input);const d=(await getAdminCollection(id)).data;const old=new Set((d.products??[]).map(p=>p.productId));for(const p of products){if(memberIds.has(p.id)&&!old.has(p.id))await addProductToAdminCollection(p.id,id);if(!memberIds.has(p.id)&&old.has(p.id))await removeProductFromAdminCollection(p.id,id)}}else await createAdminCollection(input);setId(null);setF(empty);setMemberIds(new Set());await reload()}catch{setError("Не удалось сохранить подборку.")}finally{setBusy(false)}};return <ContentSplit title="Подборки" add={()=>{setId(null);setF(empty);setMemberIds(new Set())}} list={items.map((x:AdminCollection)=><ContentRow key={x.id} title={x.name} meta={`${x.productCount??0} товаров · порядок ${x.sortOrder} · ${x.showOnHome?"на Главной":"не на Главной"}`} onEdit={()=>void edit(x)} onDelete={async()=>{if(confirm(`Удалить подборку «${x.name}»?`)){await deleteAdminCollection(x.id);await reload()}}}/>)}><div className="admin-form-grid"><Field t="Название *" v={f.name} set={(v)=>setF({...f,name:v,slug:id?f.slug:translit(v)})}/><Field t="Slug *" v={f.slug} set={(v)=>setF({...f,slug:v})}/><Field wide t="Описание" area v={f.description} set={(v)=>setF({...f,description:v})}/><Field wide t="URL изображения" v={f.imageUrl} set={(v)=>setF({...f,imageUrl:v})}/><Field t="Порядок" type="number" v={f.sortOrder} set={(v)=>setF({...f,sortOrder:v})}/><Field t="Начало показа" type="datetime-local" v={f.startsAt} set={(v)=>setF({...f,startsAt:v})}/><Field t="Окончание показа" type="datetime-local" v={f.endsAt} set={(v)=>setF({...f,endsAt:v})}/></div><div className="admin-checkbox-row"><Check text="Активна" v={f.isActive} set={(v)=>setF({...f,isActive:v})}/><Check text="Показывать на Главной" v={f.showOnHome} set={(v)=>setF({...f,showOnHome:v})}/><Check text="Индексировать" v={f.isIndexed} set={(v)=>setF({...f,isIndexed:v})}/></div>{id&&<ProductPicker products={products} selected={memberIds} setSelected={setMemberIds}/>}<SaveButton busy={busy} onClick={save}/></ContentSplit>}

function NewSection({products,busy,setBusy,reload,setError}:any){const [q,setQ]=useState("");const shown=useMemo(()=>products.filter((p:AdminProductListItem)=>!q||p.name.toLowerCase().includes(q.toLowerCase())||p.slug.includes(q.toLowerCase())),[products,q]);return <section className="admin-editor-section"><div className="admin-section-title"><div><h2>Новинки</h2><p>Главная показывает 8 случайных активных товаров с флагом «Новинка».</p></div><strong>{products.filter((p:AdminProductListItem)=>p.is_new).length} отмечено</strong></div><input className="admin-content-search" placeholder="Поиск товара" value={q} onChange={e=>setQ(e.target.value)}/><div className="admin-content-product-list">{shown.map((p:AdminProductListItem)=><label key={p.id}><input type="checkbox" checked={Boolean(p.is_new)} disabled={busy} onChange={async e=>{setBusy(true);try{await updateAdminProduct(p.id,{isNew:e.target.checked});await reload()}catch{setError("Не удалось изменить признак Новинки.")}finally{setBusy(false)}}}/><span><strong>{p.name}</strong><small>{p.slug}</small></span></label>)}</div></section>}

function ArticlesSection({items,busy,setBusy,reload,setError}:any){const empty={title:"",slug:"",excerpt:"",content:"",coverUrl:"",coverAlt:"",readingTimeMinutes:5,status:"draft",isFeatured:true,sortOrder:0,publishedAt:"",seoTitle:"",seoDescription:""};const[id,setId]=useState<string|null>(null),[f,setF]=useState<any>(empty);const edit=(x:AdminArticle)=>{setId(x.id);setF({title:x.title,slug:x.slug,excerpt:x.excerpt,content:x.content,coverUrl:x.cover_url??"",coverAlt:x.cover_alt??"",readingTimeMinutes:x.reading_time_minutes,status:x.status,isFeatured:x.is_featured,sortOrder:x.sort_order,publishedAt:dt(x.published_at),seoTitle:x.seo_title??"",seoDescription:x.seo_description??""})};const save=async()=>{setBusy(true);try{const input={...f,coverUrl:f.coverUrl||null,coverAlt:f.coverAlt||null,readingTimeMinutes:Number(f.readingTimeMinutes),sortOrder:Number(f.sortOrder),publishedAt:iso(f.publishedAt),seoTitle:f.seoTitle||null,seoDescription:f.seoDescription||null};id?await updateAdminArticle(id,input):await createAdminArticle(input);setId(null);setF(empty);await reload()}catch{setError("Не удалось сохранить статью. Проверьте slug и обязательные поля.")}finally{setBusy(false)}};return <ContentSplit title="Статьи о чае" add={()=>{setId(null);setF(empty)}} list={items.map((x:AdminArticle)=><ContentRow key={x.id} title={x.title} meta={`${x.status==="published"?"Опубликована":"Черновик"} · ${x.reading_time_minutes} мин · порядок ${x.sort_order}`} onEdit={()=>edit(x)} onDelete={async()=>{if(confirm(`Удалить статью «${x.title}»?`)){await deleteAdminArticle(x.id);await reload()}}}/>)}><div className="admin-form-grid"><Field t="Название *" v={f.title} set={(v)=>setF({...f,title:v,slug:id?f.slug:translit(v)})}/><Field t="Slug *" v={f.slug} set={(v)=>setF({...f,slug:v})}/><Field wide t="Краткое описание *" area v={f.excerpt} set={(v)=>setF({...f,excerpt:v})}/><Field wide t="Текст статьи *" area rows={12} v={f.content} set={(v)=>setF({...f,content:v})}/><Field wide t="URL обложки" v={f.coverUrl} set={(v)=>setF({...f,coverUrl:v})}/><Field wide t="Alt обложки" v={f.coverAlt} set={(v)=>setF({...f,coverAlt:v})}/><Field t="Время чтения, мин" type="number" v={f.readingTimeMinutes} set={(v)=>setF({...f,readingTimeMinutes:v})}/><Field t="Порядок" type="number" v={f.sortOrder} set={(v)=>setF({...f,sortOrder:v})}/><label className="admin-field"><span>Статус</span><select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option value="draft">Черновик</option><option value="published">Опубликована</option></select></label><Field t="Дата публикации" type="datetime-local" v={f.publishedAt} set={(v)=>setF({...f,publishedAt:v})}/><Field wide t="SEO title" v={f.seoTitle} set={(v)=>setF({...f,seoTitle:v})}/><Field wide t="SEO description" area v={f.seoDescription} set={(v)=>setF({...f,seoDescription:v})}/></div><Check text="Показывать на Главной" v={f.isFeatured} set={(v)=>setF({...f,isFeatured:v})}/><SaveButton busy={busy} onClick={save}/></ContentSplit>}

type ContentSplitProps = {
  title: string;
  add: () => void;
  list: ReactNode[];
  children: ReactNode;
};

type ContentRowProps = {
  title: string;
  meta: string;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
};

type FieldProps = {
  t: string;
  v: string | number;
  set: (value: string) => void;
  wide?: boolean;
  type?: string;
  area?: boolean;
  rows?: number;
};

type CheckProps = {
  text: string;
  v: boolean;
  set: (value: boolean) => void;
};

type SaveButtonProps = {
  busy: boolean;
  onClick: () => void | Promise<void>;
};

type ProductPickerProps = {
  products: AdminProductListItem[];
  selected: Set<string>;
  setSelected: Dispatch<SetStateAction<Set<string>>>;
};

function ContentSplit({title,add,list,children}:ContentSplitProps){return <div className="admin-content-split"><section className="admin-editor-section"><div className="admin-section-title"><h2>{title}</h2><button type="button" className="admin-secondary-button" onClick={add}><Plus size={16}/>Новый</button></div><div className="admin-content-list">{list.length?list:<p>Пока ничего нет.</p>}</div></section><section className="admin-editor-section"><h2>Редактор</h2>{children}</section></div>}
function ContentRow({title,meta,onEdit,onDelete}:ContentRowProps){return <div className="admin-content-row"><button type="button" onClick={onEdit}><strong>{title}</strong><span>{meta}</span></button><button type="button" className="admin-icon-danger" onClick={onDelete} aria-label="Удалить"><Trash2 size={17}/></button></div>}
function Field({t,v,set,wide,type="text",area=false,rows=4}:FieldProps){return <label className={`admin-field ${wide?"admin-field-wide":""}`}><span>{t}</span>{area?<textarea rows={rows} value={v} onChange={e=>set(e.target.value)}/>:<input type={type} value={v} onChange={e=>set(e.target.value)}/>}</label>}
function Check({text,v,set}:CheckProps){return <label className="admin-content-check"><input type="checkbox" checked={v} onChange={e=>set(e.target.checked)}/>{text}</label>}
function SaveButton({busy,onClick}:SaveButtonProps){return <button type="button" className="admin-primary-button admin-content-save" disabled={busy} onClick={onClick}><Save size={17}/>{busy?"Сохранение…":"Сохранить"}</button>}
function ProductPicker({products,selected,setSelected}:ProductPickerProps){const[q,setQ]=useState("");const list=products.filter((p:AdminProductListItem)=>!q||p.name.toLowerCase().includes(q.toLowerCase())||p.slug.includes(q.toLowerCase()));return <div className="admin-product-picker"><h3>Товары подборки</h3><input placeholder="Поиск товара" value={q} onChange={e=>setQ(e.target.value)}/><div>{list.map((p:AdminProductListItem)=><label key={p.id}><input type="checkbox" checked={selected.has(p.id)} onChange={e=>{const n=new Set<string>(selected);e.target.checked?n.add(p.id):n.delete(p.id);setSelected(n)}}/>{p.name}</label>)}</div></div>}
