import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Gift, HeartHandshake, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import {
  createAdminPromoCode, createAdminPromotion, deleteAdminPromoCode, deleteAdminPromotion,
  getAdminBenefitSettings, getAdminCategories, getAdminCollections, getAdminProducts,
  getAdminPromoCodes, getAdminPromotions, updateAdminLoyaltySettings, updateAdminPromoCode,
  updateAdminPromotion, updateAdminReferralSettings, getAdminCustomers,
  getAdminReferralPartners, createAdminReferralPartner, updateAdminReferralPartner, deleteAdminReferralPartner,
} from "../../shared/api/admin";
import type {
  AdminBenefitSettings, AdminCategoryListItem, AdminCollection, AdminProductListItem,
  AdminPromoCode, AdminPromoCodeInput, AdminPromotion, AdminPromotionInput, AdminCustomerListItem,
  AdminReferralPartner, AdminReferralPartnerInput,
} from "../../shared/api/admin";

type Tab="promotions"|"codes"|"loyalty"|"referral";
type Target={id:string;name:string};
const money=(v:string|number)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(v)||0)+" ₽";
const dateInput=(v:string|null|undefined)=>v?new Date(v).toISOString().slice(0,16):"";
const apiDate=(v:string)=>v?new Date(v).toISOString():null;
const emptyPromotion:AdminPromotionInput={name:"",description:"",discountType:"percent",scope:"order",targetIds:[],value:10,buyQuantity:null,getQuantity:null,minOrderAmount:0,priority:0,audienceType:"all",customerIds:[],activationType:"automatic",promoCodeId:null,isStackable:false,usageLimit:null,perCustomerLimit:1,isActive:false,startsAt:null,endsAt:null};
const emptyCode:AdminPromoCodeInput={code:"",name:"",discountType:"percent",value:10,minOrderAmount:0,usageLimit:null,perCustomerLimit:1,isActive:true,startsAt:null,endsAt:null};

export default function AdminPromotionsPage(){
  const[tab,setTab]=useState<Tab>("promotions");
  const[promos,setPromos]=useState<AdminPromotion[]>([]);
  const[codes,setCodes]=useState<AdminPromoCode[]>([]);
  const[settings,setSettings]=useState<AdminBenefitSettings|null>(null);
  const[products,setProducts]=useState<AdminProductListItem[]>([]);
  const[categories,setCategories]=useState<AdminCategoryListItem[]>([]);
  const[collections,setCollections]=useState<AdminCollection[]>([]);
  const[customers,setCustomers]=useState<AdminCustomerListItem[]>([]);
  const[partners,setPartners]=useState<AdminReferralPartner[]>([]);
  const[editingPromotion,setEditingPromotion]=useState<AdminPromotionInput|null>(null);
  const[editingPromotionId,setEditingPromotionId]=useState<string|null>(null);
  const[editingCode,setEditingCode]=useState<AdminPromoCodeInput|null>(null);
  const[editingCodeId,setEditingCodeId]=useState<string|null>(null);
  const[error,setError]=useState("");
  const[msg,setMsg]=useState("");
  const[busy,setBusy]=useState(false);

  const load=async()=>{
    try{
      const[a,b,c,d,e,f,g,h]=await Promise.all([
        getAdminPromotions(),getAdminPromoCodes(),getAdminBenefitSettings(),
        getAdminProducts({page:1,limit:100}),getAdminCategories({page:1,limit:100}),getAdminCollections(),
        getAdminCustomers({page:1,limit:100}),getAdminReferralPartners()
      ]);
      setPromos(a.data);setCodes(b.data);setSettings(c.data);setProducts(d.data);setCategories(e.data);setCollections(f.data);setCustomers(g.data);setPartners(h.data);setError("");
    }catch(err){setError(err instanceof Error?err.message:"Не удалось загрузить раздел «Акции».")}
  };
  useEffect(()=>{void load()},[]);

  const run=async(fn:()=>Promise<unknown>,ok="Сохранено.")=>{
    setBusy(true);setError("");setMsg("");
    try{await fn();setMsg(ok);await load();return true}
    catch(err){setError(err instanceof Error?err.message:"Не удалось сохранить изменения.");return false}
    finally{setBusy(false)}
  };

  const newPromotion=()=>{setEditingPromotionId(null);setEditingPromotion({...emptyPromotion});};
  const editPromotion=(x:AdminPromotion)=>{setEditingPromotionId(x.id);setEditingPromotion({
    name:x.name,description:x.description??"",discountType:x.discount_type,scope:x.scope,targetIds:x.target_ids??[],
    value:Number(x.value),buyQuantity:x.buy_quantity,getQuantity:x.get_quantity,minOrderAmount:Number(x.min_order_amount),
    priority:x.priority,audienceType:x.audience_type,customerIds:x.customer_ids??[],activationType:x.activation_type,promoCodeId:x.promo_code_id,isStackable:x.is_stackable,usageLimit:x.usage_limit,perCustomerLimit:x.per_customer_limit,isActive:x.is_active,startsAt:x.starts_at,endsAt:x.ends_at
  })};
  const savePromotion=async()=>{
    if(!editingPromotion)return;
    const ok=await run(
      ()=>editingPromotionId?updateAdminPromotion(editingPromotionId,editingPromotion):createAdminPromotion(editingPromotion),
      editingPromotionId?"Акция сохранена.":"Акция создана."
    );
    if(ok){setEditingPromotion(null);setEditingPromotionId(null)}
  };

  const editCode=(x:AdminPromoCode)=>{setEditingCodeId(x.id);setEditingCode({
    code:x.code,name:x.name,discountType:x.discount_type,value:Number(x.value),minOrderAmount:Number(x.min_order_amount),
    usageLimit:x.usage_limit,perCustomerLimit:x.per_customer_limit,isActive:x.is_active,startsAt:x.starts_at,endsAt:x.ends_at
  })};

  return <section className="admin-promotions-page">
    <div className="admin-page-heading"><div><h1>Акции</h1><p>Скидки, промокоды, бонусы и реферальная программа. Фактическая скидка фиксируется в заказе.</p></div></div>
    {error&&<div className="admin-editor-message is-error">{error}</div>}
    {msg&&<div className="admin-editor-message is-success">{msg}</div>}

    <div className="admin-benefit-tabs">
      <button className={tab==="promotions"?"active":""} onClick={()=>setTab("promotions")}><BadgePercent size={17}/>Акции</button>
      <button className={tab==="codes"?"active":""} onClick={()=>setTab("codes")}><Gift size={17}/>Промокоды</button>
      <button className={tab==="loyalty"?"active":""} onClick={()=>setTab("loyalty")}><HeartHandshake size={17}/>Лояльность</button>
      <button className={tab==="referral"?"active":""} onClick={()=>setTab("referral")}><Users size={17}/>Реферальная программа</button>
    </div>

    {tab==="promotions"&&<div className="admin-benefit-section">
      <div className="admin-benefit-actions"><button className="admin-primary-button" onClick={newPromotion}><Plus size={16}/>Создать акцию</button></div>
      {editingPromotion&&<PromotionEditor value={editingPromotion} setValue={setEditingPromotion} id={editingPromotionId} products={products} categories={categories} collections={collections} customers={customers} codes={codes} busy={busy} save={()=>void savePromotion()} close={()=>{setEditingPromotion(null);setEditingPromotionId(null)}}/>}
      <div className="admin-benefit-list">{promos.map(x=><article key={x.id} className="admin-editor-card admin-benefit-card">
        <div><strong>{x.name}</strong><span>{x.is_active?"Активна":"Выключена"} · {promotionSummary(x)}</span>{x.description&&<small>{x.description}</small>}</div>
        <div className="admin-benefit-row-actions">
          <button className="admin-secondary-button" onClick={()=>editPromotion(x)}><Pencil size={16}/>Изменить</button>
          <button className="admin-secondary-button" disabled={busy} onClick={()=>void run(()=>updateAdminPromotion(x.id,{isActive:!x.is_active}),x.is_active?"Акция выключена.":"Акция включена.")}>{x.is_active?"Выключить":"Включить"}</button>
          <button className="admin-icon-danger" title="Удалить" onClick={()=>{if(confirm("Удалить акцию? История уже применённых скидок в заказах сохранится."))void run(()=>deleteAdminPromotion(x.id),"Акция удалена.")}}><Trash2 size={17}/></button>
        </div>
      </article>)}{!promos.length&&<p>Акций пока нет.</p>}</div>
    </div>}

    {tab==="codes"&&<div className="admin-benefit-section">
      <div className="admin-benefit-actions"><button className="admin-primary-button" onClick={()=>{setEditingCodeId(null);setEditingCode({...emptyCode})}}><Plus size={16}/>Создать промокод</button></div>
      {editingCode&&<PromoEditor value={editingCode} setValue={setEditingCode} id={editingCodeId} busy={busy} save={async()=>{
        const ok=await run(()=>editingCodeId?updateAdminPromoCode(editingCodeId,editingCode):createAdminPromoCode(editingCode),editingCodeId?"Промокод сохранён.":"Промокод создан.");
        if(ok){setEditingCode(null);setEditingCodeId(null)}
      }} close={()=>{setEditingCode(null);setEditingCodeId(null)}}/>}
      <div className="admin-benefit-list">{codes.map(x=><article key={x.id} className="admin-editor-card admin-benefit-card">
        <div><strong>{x.code} — {x.name}</strong><span>{x.is_active?"Активен":"Выключен"} · {x.discount_type==="percent"?`${x.value}%`:x.discount_type==="fixed"?money(x.value):"Бесплатная доставка"} · от {money(x.min_order_amount)}</span><small>Использован: {x.used_count}{x.usage_limit?` / ${x.usage_limit}`:""} · лимит на покупателя: {x.per_customer_limit}</small></div>
        <div className="admin-benefit-row-actions"><button className="admin-secondary-button" onClick={()=>editCode(x)}><Pencil size={16}/>Изменить</button><button className="admin-secondary-button" disabled={busy} onClick={()=>void run(()=>updateAdminPromoCode(x.id,{isActive:!x.is_active}),x.is_active?"Промокод выключен.":"Промокод включён.")}>{x.is_active?"Выключить":"Включить"}</button><button className="admin-icon-danger" onClick={()=>{if(confirm("Удалить промокод?"))void run(()=>deleteAdminPromoCode(x.id),"Промокод удалён.")}}><Trash2 size={17}/></button></div>
      </article>)}</div>
    </div>}

    {tab==="loyalty"&&settings&&<Loyalty value={settings} save={(x)=>void run(()=>updateAdminLoyaltySettings(x),"Настройки лояльности сохранены.")}/>}
    {tab==="referral"&&settings&&<Referral value={settings} partners={partners} reload={load} run={run} save={(x)=>void run(()=>updateAdminReferralSettings(x),"Настройки реферальной программы сохранены.")}/>}
  </section>
}

function promotionSummary(x:AdminPromotion){
  const discount=x.discount_type==="percent"?`${x.value}%`:x.discount_type==="fixed"?money(x.value):x.discount_type==="free_delivery"?"Бесплатная доставка":`${x.buy_quantity}+${x.get_quantity}`;
  const scope=x.scope==="order"?"на заказ":x.scope==="product"?"на товары":x.scope==="category"?"на категории":"на подборки";
  return `${discount} ${scope} · от ${money(x.min_order_amount)}`;
}

function PromotionEditor({value,setValue,id,products,categories,collections,customers,codes,busy,save,close}:{value:AdminPromotionInput;setValue:(x:AdminPromotionInput)=>void;id:string|null;products:AdminProductListItem[];categories:AdminCategoryListItem[];collections:AdminCollection[];customers:AdminCustomerListItem[];codes:AdminPromoCode[];busy:boolean;save:()=>void;close:()=>void}){
  const targets:Target[]=useMemo(()=>value.scope==="product"?products.map(x=>({id:x.id,name:x.name})):value.scope==="category"?categories.map(x=>({id:x.id,name:x.name})):value.scope==="collection"?collections.map(x=>({id:x.id,name:x.name})):[],[value.scope,products,categories,collections]);
  const toggle=(id:string)=>setValue({...value,targetIds:value.targetIds.includes(id)?value.targetIds.filter(x=>x!==id):[...value.targetIds,id]});
  return <div className="admin-editor-card admin-benefit-editor"><div className="admin-benefit-editor-head"><h2>{id?"Редактирование акции":"Новая акция"}</h2><button className="admin-icon-button" onClick={close}><X size={18}/></button></div>
    <div className="admin-benefit-form-grid">
      <label className="wide"><span>Название *</span><input value={value.name} onChange={e=>setValue({...value,name:e.target.value})} placeholder="Например: Осенняя скидка 15%"/></label>
      <label><span>Тип</span><select value={value.discountType} onChange={e=>setValue({...value,discountType:e.target.value as AdminPromotionInput["discountType"],value:e.target.value==="free_delivery"?0:value.value})}><option value="percent">Скидка, %</option><option value="fixed">Скидка, ₽</option><option value="free_delivery">Бесплатная доставка</option><option value="buy_x_get_y">N+M</option></select></label>
      <label><span>Кому доступна акция</span><select value={value.audienceType} onChange={e=>setValue({...value,audienceType:e.target.value as AdminPromotionInput["audienceType"],customerIds:[]})}><option value="all">Всем покупателям</option><option value="registered">Только зарегистрированным</option><option value="guests">Только гостям</option><option value="customers">Конкретным покупателям</option></select></label>
      <label><span>Активация</span><select value={value.activationType} onChange={e=>setValue({...value,activationType:e.target.value as AdminPromotionInput["activationType"],promoCodeId:null})}><option value="automatic">Автоматически</option><option value="promo_code">По промокоду</option></select></label>
      {value.activationType==="promo_code"&&<label className="wide"><span>Промокод для активации *</span><select value={value.promoCodeId??""} onChange={e=>setValue({...value,promoCodeId:e.target.value||null})}><option value="">Выберите промокод</option>{codes.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></label>}
      {value.audienceType==="customers"&&<div className="admin-benefit-targets wide"><strong>Конкретные покупатели *</strong><div>{customers.map(c=><label key={c.id}><input type="checkbox" checked={value.customerIds.includes(c.id)} onChange={()=>setValue({...value,customerIds:value.customerIds.includes(c.id)?value.customerIds.filter(x=>x!==c.id):[...value.customerIds,c.id]})}/>{c.name||c.phone}{c.email?` · ${c.email}`:""}</label>)}</div></div>}
      <label><span>Область действия</span><select value={value.scope} onChange={e=>setValue({...value,scope:e.target.value as AdminPromotionInput["scope"],targetIds:[]})}><option value="order">Весь заказ</option><option value="product">Конкретные товары</option><option value="category">Категории</option><option value="collection">Подборки</option></select></label>
      {value.discountType!=="free_delivery"&&value.discountType!=="buy_x_get_y"&&<label><span>{value.discountType==="percent"?"Скидка, %":"Скидка, ₽"}</span><input type="number" min="0" max={value.discountType==="percent"?100:undefined} value={value.value} onChange={e=>setValue({...value,value:Number(e.target.value)})}/></label>}
      {value.discountType==="buy_x_get_y"&&<><label><span>Купить, шт.</span><input type="number" min="1" value={value.buyQuantity??1} onChange={e=>setValue({...value,buyQuantity:Number(e.target.value)})}/></label><label><span>Получить бесплатно, шт.</span><input type="number" min="1" value={value.getQuantity??1} onChange={e=>setValue({...value,getQuantity:Number(e.target.value)})}/></label></>}
      <label><span>Минимальная сумма заказа, ₽</span><input type="number" min="0" value={value.minOrderAmount} onChange={e=>setValue({...value,minOrderAmount:Number(e.target.value)})}/></label>
      <label><span>Приоритет</span><input type="number" value={value.priority} onChange={e=>setValue({...value,priority:Number(e.target.value)})}/></label>
      <label><span>Начало</span><input type="datetime-local" value={dateInput(value.startsAt)} onChange={e=>setValue({...value,startsAt:apiDate(e.target.value)})}/></label>
      <label><span>Окончание</span><input type="datetime-local" value={dateInput(value.endsAt)} onChange={e=>setValue({...value,endsAt:apiDate(e.target.value)})}/></label>
      <label className="wide"><span>Описание</span><textarea rows={3} value={value.description??""} onChange={e=>setValue({...value,description:e.target.value})}/></label>
      <label><span>Общий лимит применений</span><input type="number" min="1" placeholder="Без лимита" value={value.usageLimit??""} onChange={e=>setValue({...value,usageLimit:e.target.value?Number(e.target.value):null})}/></label>
      <label><span>Лимит на покупателя</span><input type="number" min="1" value={value.perCustomerLimit} onChange={e=>setValue({...value,perCustomerLimit:Number(e.target.value)})}/></label>
      <label className="admin-benefit-check wide"><input type="checkbox" checked={value.isStackable} onChange={e=>setValue({...value,isStackable:e.target.checked})}/>Можно сочетать со следующими акциями</label>
      <label className="admin-benefit-check wide"><input type="checkbox" checked={value.isActive} onChange={e=>setValue({...value,isActive:e.target.checked})}/>Акция активна</label>
    </div>
    {value.scope!=="order"&&<div className="admin-benefit-targets"><strong>На что действует акция *</strong><div>{targets.map(t=><label key={t.id}><input type="checkbox" checked={value.targetIds.includes(t.id)} onChange={()=>toggle(t.id)}/>{t.name}</label>)}</div>{!targets.length&&<p>Нет доступных элементов.</p>}</div>}
    <div className="admin-benefit-editor-actions"><button className="admin-primary-button" disabled={busy} onClick={save}><Save size={16}/>{busy?"Сохранение…":"Сохранить акцию"}</button><button className="admin-secondary-button" onClick={close}>Отмена</button></div>
  </div>
}

function PromoEditor({value,setValue,id,busy,save,close}:{value:AdminPromoCodeInput;setValue:(x:AdminPromoCodeInput)=>void;id:string|null;busy:boolean;save:()=>void;close:()=>void}){
  return <div className="admin-editor-card admin-benefit-editor"><div className="admin-benefit-editor-head"><h2>{id?"Редактирование промокода":"Новый промокод"}</h2><button className="admin-icon-button" onClick={close}><X size={18}/></button></div><div className="admin-benefit-form-grid">
    <label><span>Код *</span><input value={value.code} onChange={e=>setValue({...value,code:e.target.value.toUpperCase().replace(/\s+/g,"")})} placeholder="TEA10"/></label>
    <label><span>Название *</span><input value={value.name} onChange={e=>setValue({...value,name:e.target.value})} placeholder="Скидка для подписчиков"/></label>
    <label><span>Тип скидки</span><select value={value.discountType} onChange={e=>setValue({...value,discountType:e.target.value as AdminPromoCodeInput["discountType"],value:e.target.value==="free_delivery"?0:value.value})}><option value="percent">Процент</option><option value="fixed">Фиксированная сумма</option><option value="free_delivery">Бесплатная доставка</option></select></label>
    {value.discountType!=="free_delivery"&&<label><span>{value.discountType==="percent"?"Скидка, %":"Скидка, ₽"}</span><input type="number" min="0" max={value.discountType==="percent"?100:undefined} value={value.value} onChange={e=>setValue({...value,value:Number(e.target.value)})}/></label>}
    <label><span>Минимальный заказ, ₽</span><input type="number" min="0" value={value.minOrderAmount} onChange={e=>setValue({...value,minOrderAmount:Number(e.target.value)})}/></label>
    <label><span>Общий лимит использований</span><input type="number" min="1" placeholder="Без лимита" value={value.usageLimit??""} onChange={e=>setValue({...value,usageLimit:e.target.value?Number(e.target.value):null})}/></label>
    <label><span>Лимит на покупателя</span><input type="number" min="1" value={value.perCustomerLimit} onChange={e=>setValue({...value,perCustomerLimit:Number(e.target.value)})}/></label>
    <label><span>Начало</span><input type="datetime-local" value={dateInput(value.startsAt)} onChange={e=>setValue({...value,startsAt:apiDate(e.target.value)})}/></label>
    <label><span>Окончание</span><input type="datetime-local" value={dateInput(value.endsAt)} onChange={e=>setValue({...value,endsAt:apiDate(e.target.value)})}/></label>
    <label className="admin-benefit-check wide"><input type="checkbox" checked={value.isActive} onChange={e=>setValue({...value,isActive:e.target.checked})}/>Промокод активен</label>
  </div><p className="admin-benefit-hint">Лимит на покупателя контролируется для зарегистрированных покупателей. Общий лимит действует для всех.</p><div className="admin-benefit-editor-actions"><button className="admin-primary-button" disabled={busy} onClick={save}><Save size={16}/>{busy?"Сохранение…":"Сохранить промокод"}</button><button className="admin-secondary-button" onClick={close}>Отмена</button></div></div>
}

function Loyalty({value,save}:{value:AdminBenefitSettings;save:(x:{isActive:boolean;earnPercent:number;maxSpendPercent:number;minOrderAmount:number;bonusLifetimeDays:number|null;minSpendPoints:number;allowWithPromotions:boolean;allowWithPromoCodes:boolean})=>void}){const[x,setX]=useState({isActive:value.loyalty.is_active,earnPercent:Number(value.loyalty.earn_percent),maxSpendPercent:Number(value.loyalty.max_spend_percent),minOrderAmount:Number(value.loyalty.min_order_amount),bonusLifetimeDays:value.loyalty.bonus_lifetime_days,minSpendPoints:Number(value.loyalty.min_spend_points),allowWithPromotions:value.loyalty.allow_with_promotions,allowWithPromoCodes:value.loyalty.allow_with_promo_codes});return <div className="admin-editor-card admin-benefit-form"><h2>Программа лояльности</h2><p>Бонусы начисляются зарегистрированному покупателю после завершения заказа. Списание фиксируется в заказе как отдельная скидка.</p><label className="admin-benefit-check"><input type="checkbox" checked={x.isActive} onChange={e=>setX({...x,isActive:e.target.checked})}/>Включена</label><label><span>Начислять бонусов, %</span><input type="number" min="0" max="100" value={x.earnPercent} onChange={e=>setX({...x,earnPercent:Number(e.target.value)})}/></label><label><span>Максимальная оплата бонусами, % заказа</span><input type="number" min="0" max="100" value={x.maxSpendPercent} onChange={e=>setX({...x,maxSpendPercent:Number(e.target.value)})}/></label><label><span>Минимальная сумма заказа</span><input type="number" min="0" value={x.minOrderAmount} onChange={e=>setX({...x,minOrderAmount:Number(e.target.value)})}/></label><label><span>Минимум бонусов для списания</span><input type="number" min="0" value={x.minSpendPoints} onChange={e=>setX({...x,minSpendPoints:Number(e.target.value)})}/></label><label><span>Срок жизни бонусов, дней</span><input type="number" min="1" placeholder="Без срока" value={x.bonusLifetimeDays??""} onChange={e=>setX({...x,bonusLifetimeDays:e.target.value?Number(e.target.value):null})}/></label><label className="admin-benefit-check"><input type="checkbox" checked={x.allowWithPromotions} onChange={e=>setX({...x,allowWithPromotions:e.target.checked})}/>Разрешить списание вместе с акциями</label><label className="admin-benefit-check"><input type="checkbox" checked={x.allowWithPromoCodes} onChange={e=>setX({...x,allowWithPromoCodes:e.target.checked})}/>Разрешить списание вместе с промокодами</label><button className="admin-primary-button" onClick={()=>save(x)}><Save size={16}/>Сохранить</button></div>}

function Referral({value,partners,run,save}:{value:AdminBenefitSettings;partners:AdminReferralPartner[];reload:()=>Promise<void>;run:(fn:()=>Promise<unknown>,ok?:string)=>Promise<boolean>;save:(x:{isActive:boolean;inviterBonus:number;inviteeDiscountPercent:number;minOrderAmount:number})=>void}){const[x,setX]=useState({isActive:value.referral.is_active,inviterBonus:Number(value.referral.inviter_bonus),inviteeDiscountPercent:Number(value.referral.invitee_discount_percent),minOrderAmount:Number(value.referral.min_order_amount)});const[partner,setPartner]=useState<AdminReferralPartnerInput|null>(null);const[partnerId,setPartnerId]=useState<string|null>(null);const origin=window.location.origin;const edit=(p:AdminReferralPartner)=>{setPartnerId(p.id);setPartner({name:p.name,contact:p.contact??"",code:p.code,inviteeDiscountPercent:Number(p.invitee_discount_percent),commissionPercent:Number(p.commission_percent),minOrderAmount:Number(p.min_order_amount),isActive:p.is_active})};const submit=async()=>{if(!partner)return;const ok=await run(()=>partnerId?updateAdminReferralPartner(partnerId,partner):createAdminReferralPartner(partner),partnerId?"Партнёр сохранён.":"Партнёр создан.");if(ok){setPartner(null);setPartnerId(null)}};return <div className="admin-benefit-section"><div className="admin-editor-card admin-benefit-form"><h2>«Пригласи друга»</h2><p>Для зарегистрированных покупателей. Друг получает скидку на первый заказ по персональному коду, пригласивший — бонус после завершения заказа.</p><label className="admin-benefit-check"><input type="checkbox" checked={x.isActive} onChange={e=>setX({...x,isActive:e.target.checked})}/>Включена</label><label><span>Бонус пригласившему, ₽</span><input type="number" min="0" value={x.inviterBonus} onChange={e=>setX({...x,inviterBonus:Number(e.target.value)})}/></label><label><span>Скидка приглашённому, %</span><input type="number" min="0" max="100" value={x.inviteeDiscountPercent} onChange={e=>setX({...x,inviteeDiscountPercent:Number(e.target.value)})}/></label><label><span>Минимальная сумма первого заказа</span><input type="number" min="0" value={x.minOrderAmount} onChange={e=>setX({...x,minOrderAmount:Number(e.target.value)})}/></label><button className="admin-primary-button" onClick={()=>save(x)}><Save size={16}/>Сохранить</button></div><div className="admin-editor-card"><div className="admin-benefit-editor-head"><div><h2>Партнёры</h2><p>Блогеры, каналы и другие партнёры получают собственный код и ссылку.</p></div><button className="admin-primary-button" onClick={()=>{setPartnerId(null);setPartner({name:"",contact:"",code:"",inviteeDiscountPercent:5,commissionPercent:10,minOrderAmount:0,isActive:true})}}><Plus size={16}/>Добавить партнёра</button></div>{partner&&<div className="admin-benefit-form-grid"><label><span>Название *</span><input value={partner.name} onChange={e=>setPartner({...partner,name:e.target.value})}/></label><label><span>Контакт</span><input value={partner.contact??""} onChange={e=>setPartner({...partner,contact:e.target.value})}/></label><label><span>Код *</span><input value={partner.code} onChange={e=>setPartner({...partner,code:e.target.value.toUpperCase().replace(/\s+/g,"")})}/></label><label><span>Скидка покупателю, %</span><input type="number" min="0" max="100" value={partner.inviteeDiscountPercent} onChange={e=>setPartner({...partner,inviteeDiscountPercent:Number(e.target.value)})}/></label><label><span>Вознаграждение партнёру, %</span><input type="number" min="0" max="100" value={partner.commissionPercent} onChange={e=>setPartner({...partner,commissionPercent:Number(e.target.value)})}/></label><label><span>Минимальная сумма заказа</span><input type="number" min="0" value={partner.minOrderAmount} onChange={e=>setPartner({...partner,minOrderAmount:Number(e.target.value)})}/></label><label className="admin-benefit-check wide"><input type="checkbox" checked={partner.isActive} onChange={e=>setPartner({...partner,isActive:e.target.checked})}/>Партнёр активен</label><div className="admin-benefit-editor-actions wide"><button className="admin-primary-button" onClick={()=>void submit()}><Save size={16}/>Сохранить партнёра</button><button className="admin-secondary-button" onClick={()=>{setPartner(null);setPartnerId(null)}}>Отмена</button></div></div>}<div className="admin-benefit-list">{partners.map(p=><article key={p.id} className="admin-benefit-card"><div><strong>{p.name} · {p.code}</strong><span>{p.is_active?"Активен":"Выключен"} · скидка {p.invitee_discount_percent}% · партнёру {p.commission_percent}%</span><small>Ссылка: {origin}/?ref={p.code}</small><small>Заказов: {p.order_count} · выручка: {money(p.revenue)} · начислено: {money(p.commission_total)}</small></div><div className="admin-benefit-row-actions"><button className="admin-secondary-button" onClick={()=>void navigator.clipboard.writeText(`${origin}/?ref=${p.code}`)}>Скопировать ссылку</button><button className="admin-secondary-button" onClick={()=>edit(p)}><Pencil size={16}/>Изменить</button><button className="admin-icon-danger" onClick={()=>{if(confirm("Удалить партнёра?"))void run(()=>deleteAdminReferralPartner(p.id),"Партнёр удалён.")}}><Trash2 size={17}/></button></div></article>)}</div></div></div>}
