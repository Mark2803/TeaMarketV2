import "dotenv/config";
import {prisma} from "../src/database/prisma.js";
async function main(){
 const name="Яндекс Доставка — ПВЗ";
 const method=await prisma.delivery_methods.upsert({where:{name},create:{name,base_cost:0,delivery_term:"По расчёту Яндекса",is_active:true,sort_order:10},update:{is_active:true,delivery_term:"По расчёту Яндекса"}});
 console.log(`Способ доставки активен: ${method.name} (${method.id})`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
