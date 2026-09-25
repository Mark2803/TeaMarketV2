import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../database/prisma.js";
export async function getModeratorCustomer(id:string){return prisma.customers.findUnique({where:{id},include:{customer_addresses:{orderBy:[{is_default:"desc"},{created_at:"desc"}]},orders:{orderBy:{ordered_at:"desc"},include:{order_items:{select:{id:true}},order_deliveries:{include:{delivery_methods:true}}}}}})}
export async function updateModeratorCustomer(id:string,input:{name?:string|null|undefined;phone?:string|null|undefined;email?:string|null|undefined;username?:string|null|undefined;birthDate?:Date|null|undefined}){try{return await prisma.customers.update({where:{id},data:{...(input.name!==undefined?{name:input.name||null}:{}),...(input.phone!==undefined?{phone:input.phone||null}:{}),...(input.email!==undefined?{email:input.email||null}:{}),...(input.username!==undefined?{username:input.username||null}:{}),...(input.birthDate!==undefined?{birth_date:input.birthDate}:{}),updated_at:new Date()}})}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2025")return null;throw e}}


export async function deleteModeratorCustomer(id:string){
  const existing=await prisma.customers.findUnique({where:{id},select:{id:true,_count:{select:{orders:true}}}});
  if(!existing)return null;
  await prisma.$transaction(async tx=>{
    // Заказы являются историей магазина: сохраняем их, но отвязываем от удаляемого аккаунта.
    await tx.orders.updateMany({where:{customer_id:id},data:{customer_id:null}});
    await tx.carts.deleteMany({where:{customer_id:id}});
    await tx.referrals.deleteMany({where:{OR:[{inviter_customer_id:id},{invited_customer_id:id}]}});
    await tx.referral_codes.deleteMany({where:{customer_id:id}});
    await tx.loyalty_transactions.deleteMany({where:{customer_id:id}});
    await tx.loyalty_accounts.deleteMany({where:{customer_id:id}});
    await tx.customers.delete({where:{id}});
  });
  return {deleted:true,preservedOrders:existing._count.orders};
}
