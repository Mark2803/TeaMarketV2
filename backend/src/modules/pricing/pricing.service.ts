import {prisma} from "../../database/prisma.js";
export type PricingItem={productId:string;variantId:string;quantity:number;unitPrice:number;categoryIds:string[];collectionIds:string[]};
export type DiscountLine={sourceType:"promotion"|"promo_code"|"referral"|"loyalty";sourceId:string|null;code:string|null;name:string;amount:number;metadata?:Record<string,unknown>};
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
function activeWindow(x:{is_active:boolean;starts_at:Date|null;ends_at:Date|null},now:Date){return x.is_active&&(!x.starts_at||x.starts_at<=now)&&(!x.ends_at||x.ends_at>=now)}
function targets(x:unknown){return Array.isArray(x)?x.filter((v):v is string=>typeof v==="string"):[]}
export async function calculatePricing(items:PricingItem[],deliveryCost:number,promoCode?:string|null,referralCode?:string|null,loyaltyToSpend=0,customerId?:string|null){const now=new Date();const gross=round(items.reduce((s,i)=>s+i.unitPrice*i.quantity,0));let itemsAfter=gross;let delivery=deliveryCost;const discounts:DiscountLine[]=[];
 const promotions=(await prisma.promotions.findMany({orderBy:{priority:"desc"}})).filter(x=>activeWindow(x,now)&&gross>=Number(x.min_order_amount));
 for(const p of promotions){
   const customerIds=targets(p.customer_ids);
   const audienceOk=p.audience_type==="all"||(p.audience_type==="registered"&&!!customerId)||(p.audience_type==="guests"&&!customerId)||(p.audience_type==="customers"&&!!customerId&&customerIds.includes(customerId));
   if(!audienceOk)continue;
   if(p.activation_type==="promo_code"){
     if(!promoCode||!p.promo_code_id)continue;
     const activating=await prisma.promo_codes.findUnique({where:{id:p.promo_code_id}});
     if(!activating||activating.code!==promoCode.trim().toUpperCase())continue;
   }
   if(p.usage_limit){
     const used=await prisma.order_discounts.count({where:{source_type:"promotion",source_id:p.id,orders:{status:{not:"cancelled"}}}});
     if(used>=p.usage_limit)continue;
   }
   if(customerId&&p.per_customer_limit){
     const usedByCustomer=await prisma.order_discounts.count({where:{source_type:"promotion",source_id:p.id,orders:{customer_id:customerId,status:{not:"cancelled"}}}});
     if(usedByCustomer>=p.per_customer_limit)continue;
   }
   const ids=targets(p.target_ids);let eligible=0;
   if(p.scope==="order")eligible=itemsAfter;else for(const i of items){const ok=p.scope==="product"?ids.includes(i.productId):p.scope==="category"?i.categoryIds.some(v=>ids.includes(v)):i.collectionIds.some(v=>ids.includes(v));if(ok)eligible+=i.unitPrice*i.quantity;}
   if(eligible<=0)continue;
   let amount=0;if(p.discount_type==="percent")amount=eligible*Number(p.value)/100;else if(p.discount_type==="fixed")amount=Math.min(eligible,Number(p.value));else if(p.discount_type==="free_delivery")amount=delivery;else if(p.discount_type==="buy_x_get_y"&&p.scope!=="order"){const buy=p.buy_quantity??1,get=p.get_quantity??1;for(const i of items){const ok=p.scope==="product"?ids.includes(i.productId):p.scope==="category"?i.categoryIds.some(v=>ids.includes(v)):i.collectionIds.some(v=>ids.includes(v));if(ok){const free=Math.floor(i.quantity/(buy+get))*get;amount+=free*i.unitPrice;}}}
   amount=round(Math.min(amount,p.discount_type==="free_delivery"?delivery:itemsAfter));
   if(amount>0){if(p.discount_type==="free_delivery")delivery=round(delivery-amount);else itemsAfter=round(itemsAfter-amount);discounts.push({sourceType:"promotion",sourceId:p.id,code:null,name:p.name,amount,metadata:{scope:p.scope,type:p.discount_type,audience:p.audience_type}});if(!p.is_stackable)break;}
 }
 if(promoCode){const code=promoCode.trim().toUpperCase();const p=await prisma.promo_codes.findUnique({where:{code}});let customerUses=0;if(p&&customerId){customerUses=await prisma.order_discounts.count({where:{source_type:"promo_code",source_id:p.id,orders:{customer_id:customerId,status:{not:"cancelled"}}}});}const withinCustomerLimit=!p||!customerId||customerUses<p.per_customer_limit;if(p&&activeWindow(p,now)&&gross>=Number(p.min_order_amount)&&(!p.usage_limit||p.used_count<p.usage_limit)&&withinCustomerLimit){let amount=p.discount_type==="percent"?itemsAfter*Number(p.value)/100:p.discount_type==="fixed"?Math.min(itemsAfter,Number(p.value)):delivery;amount=round(amount);if(amount>0){if(p.discount_type==="free_delivery")delivery=round(delivery-amount);else itemsAfter=round(itemsAfter-amount);discounts.push({sourceType:"promo_code",sourceId:p.id,code:p.code,name:p.name,amount});}}}
 if(referralCode&&customerId){const code=referralCode.trim().toUpperCase();const [settings,ref,partner,previousOrders]=await Promise.all([prisma.referral_settings.findUnique({where:{id:1}}),prisma.referral_codes.findUnique({where:{code}}),prisma.referral_partners.findUnique({where:{code}}),prisma.orders.count({where:{customer_id:customerId,status:{not:"cancelled"}}})]);if(previousOrders===0){if(settings?.is_active&&ref&&ref.customer_id!==customerId&&gross>=Number(settings.min_order_amount)){const amount=round(itemsAfter*Number(settings.invitee_discount_percent)/100);if(amount>0){itemsAfter=round(itemsAfter-amount);discounts.push({sourceType:"referral",sourceId:null,code,name:"Реферальная скидка",amount,metadata:{kind:"customer"}});}}else if(partner?.is_active&&gross>=Number(partner.min_order_amount)){const amount=round(itemsAfter*Number(partner.invitee_discount_percent)/100);if(amount>0){itemsAfter=round(itemsAfter-amount);discounts.push({sourceType:"referral",sourceId:partner.id,code,name:`Партнёрская скидка: ${partner.name}`,amount,metadata:{kind:"partner",commissionPercent:Number(partner.commission_percent)}});}}}}
 let loyaltySpent=0;if(customerId&&loyaltyToSpend>0){const [settings,account]=await Promise.all([prisma.loyalty_settings.findUnique({where:{id:1}}),prisma.loyalty_accounts.findUnique({where:{customer_id:customerId}})]);if(settings?.is_active&&account&&loyaltyToSpend>=Number(settings.min_spend_points)){const hasPromotion=discounts.some(x=>x.sourceType==="promotion");const hasPromo=discounts.some(x=>x.sourceType==="promo_code");if((settings.allow_with_promotions||!hasPromotion)&&(settings.allow_with_promo_codes||!hasPromo)){const cap=itemsAfter*Number(settings.max_spend_percent)/100;loyaltySpent=round(Math.min(loyaltyToSpend,Number(account.balance),cap,itemsAfter));if(loyaltySpent>0){itemsAfter=round(itemsAfter-loyaltySpent);discounts.push({sourceType:"loyalty",sourceId:null,code:null,name:"Списание бонусов",amount:loyaltySpent});}}}}
 const discountTotal=round(gross+deliveryCost-(itemsAfter+delivery));return{grossItemsTotal:gross,itemsTotal:itemsAfter,deliveryCost:delivery,discountTotal,totalAmount:round(itemsAfter+delivery),loyaltySpent,discounts};}
