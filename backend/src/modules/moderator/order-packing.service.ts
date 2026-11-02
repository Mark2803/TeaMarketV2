import { prisma } from "../../database/prisma.js";

// Conservative 1 cm voxel approximation of a stand-up pouch: the gusset is widest
// at the base and tapers linearly to the sealed top. It is NOT a measured 3D mesh.
// Packing suggestions require physical verification before buying carrier labels.
type Item = { sku: string; length: number; width: number; height: number; grams: number };
type Box = { id: string; code: string; dims: [number,number,number]; tare: number };
type Placement = { sku: string; position_cm: number[]; orientation: number[]; base_direction: number; weight_g: number };
type Parcel = { package_id: string; code: string; dimensions_cm: number[]; weight_g: number; placements: Placement[] };
type Shape = { dims: [number,number,number]; cells: number[][]; orientation: number[]; baseDirection: number };
const CM = (v: unknown) => Math.ceil(Number(v));
function shapes(item: Item): Shape[] {
  const original: [number,number,number] = [CM(item.length), CM(item.height), CM(item.width)];
  const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const result: Shape[] = [];
  for (const perm of permutations) for (const flip of [0,1]) {
    const dims = perm.map(i => original[i]!) as [number,number,number];
    const cells: number[][] = [];
    for (let x=0;x<dims[0];x++) for (let y=0;y<dims[1];y++) for (let z=0;z<dims[2];z++) {
      const xyz = [x,y,z];
      const originalY = xyz[perm.indexOf(1)]!;
      const originalZ = xyz[perm.indexOf(2)]!;
      const h = original[1], depth = original[2];
      // Use the thickest point in each height cell to avoid false free voxels.
      const fromBase = flip ? originalY + 1 : h - originalY;
      const thick = depth * Math.min(1, fromBase / h);
      if (originalZ + 1 > (depth - thick)/2 && originalZ < (depth + thick)/2) cells.push(xyz);
    }
    result.push({dims,cells,orientation:perm,baseDirection:flip});
  }
  return result;
}
function tryBox(box: Box, items: Item[]): {placed: Placement[];remaining: Item[]} {
  const lx=CM(box.dims[0]), ly=CM(box.dims[1]), lz=CM(box.dims[2]);
  if (lx*ly*lz > 250000 || lx<=0 || ly<=0 || lz<=0) throw new Error("PACKAGE_DIMENSIONS_TOO_LARGE");
  const occupied = new Uint8Array(lx*ly*lz);
  const index = (x:number,y:number,z:number) => (x*ly+y)*lz+z;
  const placed: Placement[] = [], remaining: Item[]=[];
  for (const item of items) {
    let found = false;
    const variants = shapes(item);
    outer: for (const shape of variants) {
      const [sx,sy,sz]=shape.dims;
      if (sx>lx || sy>ly || sz>lz) continue;
      // Prefer floor placement, then stable packing towards one corner.
      for (let y=0;y<=ly-sy;y++) for(let x=0;x<=lx-sx;x++) for(let z=0;z<=lz-sz;z++) {
        if (shape.cells.some(c=>occupied[index(x+c[0]!,y+c[1]!,z+c[2]!)])) continue;
        for (const c of shape.cells) occupied[index(x+c[0]!,y+c[1]!,z+c[2]!)] = 1;
        placed.push({sku:item.sku,position_cm:[x,y,z],orientation:shape.orientation,base_direction:shape.baseDirection,weight_g:item.grams});
        found=true;break outer;
      }
    }
    if(!found)remaining.push(item);
  }
  return {placed,remaining};
}
/** Общий подбор упаковки по позициям корзины или заказа. */
export async function calculateItemsPacking(lines: ReadonlyArray<{sku:string;quantity:number}>, preferredPackageId?: string) {
  const skus=[...new Set(lines.map(i=>i.sku))];
  const variants=await prisma.product_variants.findMany({where:{sku:{in:skus}}});
  const bySku=new Map(variants.map(v=>[v.sku,v]));
  const items: Item[]=[];
  const missing: string[]=[];
  for(const line of lines){
    const v=bySku.get(line.sku);
    if(!v || [v.package_length_cm,v.package_width_cm,v.package_height_cm,v.shipping_weight_g].some(n=>n==null || Number(n)<=0)) {missing.push(line.sku);continue;}
    if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>80)throw new Error("INVALID_ITEM_QUANTITY");
    for(let i=0;i<line.quantity;i++)items.push({sku:line.sku,length:Number(v.package_length_cm),width:Number(v.package_width_cm),height:Number(v.package_height_cm),grams:Number(v.shipping_weight_g)});
  }
  if(missing.length) return {status:"missing_dimensions",missing_skus:missing,parcels:[],total_weight_g:null,estimated:true};
  if(items.length===0 || items.length>80)throw new Error("INVALID_ITEM_COUNT");
  const rows=await prisma.shipping_packages.findMany({where:{is_active:true,tare_weight_g:{not:null}}});
  const boxes:Box[]=rows.filter(b=>Number(b.tare_weight_g)>0).map(b=>({id:b.id,code:b.code,dims:[Number(b.inner_length_cm),Number(b.inner_width_cm),Number(b.inner_height_cm)],tare:Number(b.tare_weight_g)}));
  if(!boxes.length)return {status:"no_boxes",missing_skus:[],parcels:[],total_weight_g:null,estimated:true};
  if(preferredPackageId && !boxes.some(b=>b.id===preferredPackageId))throw new Error("PACKAGE_NOT_ACTIVE");
  boxes.sort((a,b)=>a.dims.reduce((p,c)=>p*c,1)-b.dims.reduce((p,c)=>p*c,1));
  items.sort((a,b)=>(b.length*b.width*b.height)-(a.length*a.width*a.height));
  let remaining=items, parcels:Parcel[]=[];
  while(remaining.length){
    let best: {box:Box;placed:Placement[];remaining:Item[]}|null=null;
    for(const box of boxes){
      if(preferredPackageId && parcels.length===0 && box.id!==preferredPackageId)continue;
      const attempt=tryBox(box,remaining);
      if(!attempt.placed.length)continue;
      if(!best || attempt.remaining.length<best.remaining.length || (attempt.remaining.length===best.remaining.length && box.dims.reduce((p,c)=>p*c,1)<best.box.dims.reduce((p,c)=>p*c,1)))best={box,...attempt};
      if(!attempt.remaining.length)break;
    }
    if(!best)return {status:"does_not_fit",missing_skus:[],parcels,total_weight_g:null,unpacked_skus:remaining.map(i=>i.sku),estimated:true};
    parcels.push({package_id:best.box.id,code:best.box.code,dimensions_cm:best.box.dims,weight_g:Math.ceil(best.box.tare+best.placed.reduce((s,p)=>s+p.weight_g,0)),placements:best.placed});
    remaining=best.remaining;
  }
  return {status:"calculated",missing_skus:[],parcels,total_weight_g:parcels.reduce((s,p)=>s+p.weight_g,0),estimated:true,geometry_model:"wedge_voxel_1cm_v1"};
}
/** Обратная совместимость: расчёт упаковки по существующему заказу. */
export async function calculateOrderPacking(orderNumber: string, preferredPackageId?: string) {
  const order = await prisma.orders.findUnique({where:{order_number:orderNumber},include:{order_items:true}});
  if(!order)throw new Error("ORDER_NOT_FOUND");
  return calculateItemsPacking(order.order_items.map(i=>({sku:i.sku,quantity:i.quantity})), preferredPackageId);
}

/** Расчёт по активной корзине до создания заказа. */
export async function calculateCartPacking(cartId: string, preferredPackageId?: string) {
  const cart = await prisma.carts.findUnique({where:{id:cartId},include:{cart_items:{include:{product_variants:true}}}});
  if(!cart || cart.status !== "active")throw new Error("CART_NOT_FOUND");
  return calculateItemsPacking(cart.cart_items.map(i=>({sku:i.product_variants.sku,quantity:i.quantity})), preferredPackageId);
}

export async function saveOrderPacking(orderNumber:string, preferredPackageId?:string){
  const plan=await calculateOrderPacking(orderNumber,preferredPackageId);
  if(plan.status!=="calculated")throw new Error(`PACKING_${plan.status.toUpperCase()}`);
  const order=await prisma.orders.findUnique({where:{order_number:orderNumber},select:{id:true}});
  if(!order)throw new Error("ORDER_NOT_FOUND");
  await prisma.$executeRaw`INSERT INTO order_packing_plans (order_id, plan_json, updated_at)
    VALUES (${order.id}::uuid, ${JSON.stringify(plan)}::jsonb, now())
    ON CONFLICT (order_id) DO UPDATE SET plan_json = EXCLUDED.plan_json, updated_at = now()`;
  return plan;
}
export async function getSavedOrderPacking(orderNumber:string){
  const rows=await prisma.$queryRaw<Array<{plan_json:unknown;updated_at:Date}>>`
    SELECT p.plan_json,p.updated_at FROM order_packing_plans p JOIN orders o ON o.id=p.order_id WHERE o.order_number=${orderNumber} LIMIT 1`;
  return rows[0]??null;
}
