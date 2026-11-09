/** Final isolated payment lifecycle integration test. Run from backend with npx tsx tests/payment-lifecycle-final.ts */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const originalUrl = process.env.DATABASE_URL;
if (!originalUrl) throw new Error('DATABASE_URL missing');
const source = new URL(originalUrl);
if (!['localhost','127.0.0.1','::1'].includes(source.hostname)) throw new Error('REFUSED: database host is not local');
const sourceDb = decodeURIComponent(source.pathname.slice(1));
if (!sourceDb || /^(postgres|template0|template1)$/i.test(sourceDb)) throw new Error('REFUSED: invalid source database');
const testDb = 'tm_payment_test_' + randomUUID().replace(/-/g,'').slice(0,12);
const container = 'tea-market-postgres';
const results: Array<{name:string;status:'PASS'|'FAIL';detail:string}> = [];
function check(name:string, ok:unknown, detail='') {
  results.push({name,status:ok?'PASS':'FAIL',detail});
  console.log(`[${ok?'PASS':'FAIL'}] ${name}${detail?' - '+detail:''}`);
  if(!ok) throw new Error(name+(detail?': '+detail:''));
}
function docker(args:string[], silent=false) {
  const r=spawnSync('docker', ['exec',...args], {encoding:'utf8', maxBuffer:30*1024*1024});
  if(r.status!==0) throw new Error('Docker: '+(r.stderr||r.stdout||'exit '+r.status).slice(-2000));
  if(!silent && r.stdout.trim()) console.log(r.stdout.trim());
  return r.stdout;
}
const sh=(script:string, env:Record<string,string>={})=>docker([...Object.entries(env).flatMap(([k,v])=>['-e',`${k}=${v}`]),container,'sh','-ec',script],true);
let created=false;
let prisma:any;
const mockedPayments=new Map<string,{id:string;status:string;paid:boolean;amount:{value:string;currency:string};metadata:{order_id:string};confirmation:{confirmation_url:string}}>();
let providerCalls=0;
let cancellationCalls=0;
const originalFetch=globalThis.fetch;
async function run(){
  const inspect=spawnSync('docker',['inspect','-f','{{.State.Running}}',container],{encoding:'utf8'});
  check('Docker PostgreSQL available',inspect.status===0 && inspect.stdout.trim()==='true');
  // Clone locally, never modify source. POSTGRES_USER inside the container owns the DB.
  sh('createdb -U "$POSTGRES_USER" "$TEST_DB"', {TEST_DB:testDb});created=true;
  sh('set -e; trap \'rm -f /tmp/tm_payment_clone.dump\' EXIT; pg_dump -Fc -U "$POSTGRES_USER" -d "$SOURCE_DB" -f /tmp/tm_payment_clone.dump; pg_restore -U "$POSTGRES_USER" --no-owner --no-privileges --exit-on-error -d "$TEST_DB" /tmp/tm_payment_clone.dump', {SOURCE_DB:sourceDb,TEST_DB:testDb});
  check('Isolated database cloned',true,testDb);
  const isolated=new URL(originalUrl);isolated.pathname='/'+testDb;
  process.env.DATABASE_URL=isolated.toString();
  process.env.YOOKASSA_SHOP_ID='integration-test';process.env.YOOKASSA_SECRET_KEY='integration-test';
  for(const key of ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','MAIL_FROM','TELEGRAM_BOT_TOKEN','YANDEX_DELIVERY_TOKEN','YANDEX_API_TOKEN']) delete process.env[key];
  // The only allowed external HTTP requests are intercepted YooKassa calls.
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    if(!url.startsWith('https://api.yookassa.ru/v3/payments')) throw new Error('BLOCKED_EXTERNAL_HTTP '+url);
    providerCalls++;
    const path=url.replace('https://api.yookassa.ru/v3/payments','');
    if(init?.method==='POST' && path.endsWith('/cancel')){
      cancellationCalls++;
      const id=decodeURIComponent(path.slice(1,-7));const p=mockedPayments.get(id);
      if(!p) return new Response('{}',{status:404});
      p.status='canceled';p.paid=false;
      return Response.json(p);
    }
    if(init?.method==='POST' && !path){
      const body=JSON.parse(String(init.body));const id='mock-'+randomUUID();
      const p={id,status:'pending',paid:false,amount:body.amount,metadata:body.metadata,confirmation:{confirmation_url:'https://mock.invalid/pay/'+id}};
      mockedPayments.set(id,p);return Response.json(p);
    }
    const p=mockedPayments.get(decodeURIComponent(path.slice(1)));
    return p?Response.json(p):new Response('{}',{status:404});
  }) as typeof fetch;
  const {prisma:db}=await import('../src/database/prisma.js');prisma=db;
  const {synchronizeYooKassaPayment,expireUnpaidOrders,initiateYooKassaPayment}=await import('../src/modules/orders/yookassa.service.js');
  const {updateModeratorOrderStatus}=await import('../src/modules/moderator/moderator-order.service.js');
  const paymentMethod=await db.payment_methods.findFirst({where:{is_active:true}});
  const variant=await db.product_variants.findFirst({where:{stock_quantity:{gte:5}},include:{products:true}});
  check('Fixture payment method and product',!!paymentMethod && !!variant);
  const customer=await db.customers.create({data:{name:'Integration Test',phone:'+7999'+String(Date.now()).slice(-7)}});
  await db.loyalty_accounts.upsert({where:{customer_id:customer.id},create:{customer_id:customer.id,balance:'100.00'},update:{balance:'100.00'}});
  const promo=await db.promo_codes.create({data:{code:'PAYTEST'+randomUUID().slice(0,8).toUpperCase(),name:'Payment test',discount_type:'fixed',value:'10.00'}});
  // Disable real transports; record notification attempts through DB only.
  await db.$executeRawUnsafe("UPDATE admin_order_alert_settings SET email_enabled=true,email_recipient='test@example.invalid',telegram_enabled=false WHERE id=1");
  const {ensureNotificationDefaults}=await import('../src/modules/notifications/notification-defaults.js');
  await ensureNotificationDefaults();
  await db.notification_channel_settings.upsert({where:{channel:'email'},create:{channel:'email',is_enabled:true},update:{is_enabled:true}});
  await db.notification_templates.updateMany({where:{event_key:'order_created'},data:{is_active:true}});
  const fixture=async(label:string,ageMinutes=0,withPromo=false,withLoyalty=false)=>{
    const number='TM-PAYTEST-'+label+'-'+randomUUID().slice(0,8).toUpperCase();
    const order=await db.orders.create({data:{order_number:number,customer_id:customer.id,customer_name:'Integration Test',phone:'+79990000000',email:'test@example.invalid',items_total:'100.00',gross_items_total:'100.00',total_amount:'100.00',loyalty_spent:withLoyalty?'20.00':'0.00',promo_code:withPromo?promo.code:null,ordered_at:new Date(Date.now()-ageMinutes*60000),order_items:{create:{product_id:variant.product_id,product_name:variant.products.name,sku:variant.sku,weight_g:variant.weight_g,unit_price:'100.00',list_price:'100.00',line_total:'100.00',quantity:1}},order_payments:{create:{payment_method_id:paymentMethod.id,amount:'100.00',status:'pending'}},order_status_history:{create:{new_status:'new'}}}});
    if(withPromo) await db.order_discounts.create({data:{order_id:order.id,source_type:'promo_code',source_id:promo.id,code:promo.code,name:'Payment test',amount:'10.00'}});
    await db.product_variants.update({where:{id:variant.id},data:{stock_quantity:{decrement:1}}});
    return order;
  };
  const stockStart=(await db.product_variants.findUniqueOrThrow({where:{id:variant.id}})).stock_quantity;
  const paid=await fixture('PAID',0,true,true);
  check('Unpaid order starts as new/unpaid', (await db.orders.findUniqueOrThrow({where:{id:paid.id}})).payment_status==='unpaid');
  check('Stock reserved for test order',(await db.product_variants.findUniqueOrThrow({where:{id:variant.id}})).stock_quantity===stockStart-1);
  check('Promo not counted before payment',(await db.promo_codes.findUniqueOrThrow({where:{id:promo.id}})).used_count===0);
  check('Loyalty not debited before payment',Number((await db.loyalty_accounts.findUniqueOrThrow({where:{customer_id:customer.id}})).balance)===100);
  check('No admin alert before payment',(await db.$queryRawUnsafe('SELECT * FROM admin_order_alert_deliveries WHERE order_id=$1::uuid',paid.id)).length===0);
  const url=await initiateYooKassaPayment(paid.id);
  check('Payment initiation returns redirect',url?.startsWith('https://mock.invalid/pay/')===true);
  const payRow=await db.order_payments.findFirstOrThrow({where:{order_id:paid.id}});
  const pendingUrl=await initiateYooKassaPayment(paid.id);
  check('Pending payment reused',pendingUrl===url && (await db.order_payments.count({where:{order_id:paid.id}}))===1);
  const mock=mockedPayments.get(payRow.operation_number)!;
  mock.status='succeeded';mock.paid=true;
  await synchronizeYooKassaPayment(mock.id);
  const paidNow=await db.orders.findUniqueOrThrow({where:{id:paid.id}});
  check('Successful payment settles order',paidNow.payment_status==='paid' && paidNow.status==='confirmed');
  check('Payment record succeeded',(await db.order_payments.findFirstOrThrow({where:{order_id:paid.id}})).status==='succeeded');
  check('Promo counted after payment',(await db.promo_codes.findUniqueOrThrow({where:{id:promo.id}})).used_count===1);
  check('Loyalty debited after payment',Number((await db.loyalty_accounts.findUniqueOrThrow({where:{customer_id:customer.id}})).balance)===80);
  check('Single loyalty transaction',(await db.loyalty_transactions.count({where:{order_id:paid.id,type:'spend'}}))===1);
  const alertCount=async()=> (await db.$queryRawUnsafe('SELECT * FROM admin_order_alert_deliveries WHERE order_id=$1::uuid',paid.id)).length;
  check('Admin notification attempted after payment',(await alertCount())===1);
  const emailCount=async()=>db.notification_deliveries.count({where:{event_key:'order_created',recipient:'test@example.invalid'}});
  const emailsBefore=await emailCount();
  check('Customer confirmation attempted after payment',emailsBefore>=1);
  await synchronizeYooKassaPayment(mock.id);await synchronizeYooKassaPayment(mock.id);
  check('Duplicate webhook does not debit loyalty twice',Number((await db.loyalty_accounts.findUniqueOrThrow({where:{customer_id:customer.id}})).balance)===80);
  check('Duplicate webhook does not count promo twice',(await db.promo_codes.findUniqueOrThrow({where:{id:promo.id}})).used_count===1);
  check('Duplicate webhook does not duplicate admin alert',(await alertCount())===1);
  check('Duplicate webhook does not duplicate customer order-created email',(await emailCount())===emailsBefore);
  const cancel=await fixture('CANCEL');
  const cancelUrl=await initiateYooKassaPayment(cancel.id);
  check('Cancellation test payment created',!!cancelUrl);
  const blocked=await updateModeratorOrderStatus(cancel.order_number,'cancelled','test');
  check('Cannot release stock for live payment',!blocked.success);
  const cancelPayment=await db.order_payments.findFirstOrThrow({where:{order_id:cancel.id}});
  mockedPayments.get(cancelPayment.operation_number)!.status='canceled';
  await synchronizeYooKassaPayment(cancelPayment.operation_number);
  const cancelled=await updateModeratorOrderStatus(cancel.order_number,'cancelled','test');
  check('Canceled payment allows cancellation',cancelled.success);
  check('Cancellation restores one stock unit',(await db.product_variants.findUniqueOrThrow({where:{id:variant.id}})).stock_quantity===stockStart-1);
  const again=await updateModeratorOrderStatus(cancel.order_number,'cancelled','test');
  check('Repeated cancellation does not restore stock twice',again.success && (await db.product_variants.findUniqueOrThrow({where:{id:variant.id}})).stock_quantity===stockStart-1);
  const retry=await fixture('RETRY');
  await initiateYooKassaPayment(retry.id);
  const first=await db.order_payments.findFirstOrThrow({where:{order_id:retry.id}});
  mockedPayments.get(first.operation_number)!.status='canceled';
  const secondUrl=await initiateYooKassaPayment(retry.id);
  check('Canceled payment can be retried',!!secondUrl && (await db.order_payments.count({where:{order_id:retry.id}}))===2);
  const old=await db.order_payments.findUniqueOrThrow({where:{id:first.id}});
  check('Old payment marked canceled',old.status==='canceled');
  const expiry=await fixture('EXPIRE',65);
  await initiateYooKassaPayment(expiry.id);
  const beforeExpiry=(await db.product_variants.findUniqueOrThrow({where:{id:variant.id}})).stock_quantity;
  await expireUnpaidOrders();
  const expired=await db.orders.findUniqueOrThrow({where:{id:expiry.id}});
  check('60-minute expiry cancels order',expired.status==='cancelled');
  check('Expiry restores reserved stock',(await db.product_variants.findUniqueOrThrow({where:{id:variant.id}})).stock_quantity===beforeExpiry+1);
  check('Provider cancellation called',cancellationCalls>=1);
  const noPaidCancel=await updateModeratorOrderStatus(paid.order_number,'cancelled','test');
  check('Paid order cannot be canceled as unpaid',!noPaidCancel.success);
  check('YooKassa calls used mocked provider',providerCalls>0);
}
try {await run();} catch(e){console.error('FINAL TEST ERROR:',e instanceof Error?e.stack:e);process.exitCode=1;}
finally {
  globalThis.fetch=originalFetch;
  if(prisma) await prisma.$disconnect().catch(()=>{});
  if(created){
    // Defer drop until Node exits: other modules may still own idle PostgreSQL pools.
    process.once('exit',()=>{
      try { sh('dropdb -U "$POSTGRES_USER" --force "$TEST_DB"',{TEST_DB:testDb}); console.log('Isolated test database removed'); }
      catch(e){ console.error('CLEANUP ERROR',e); process.exitCode=1; }
    });
  }
  const passed=results.filter(x=>x.status==='PASS').length,failed=results.filter(x=>x.status==='FAIL').length;
  console.log(`SUMMARY: PASS=${passed} FAIL=${failed} SKIP=0`);
  if(failed || process.exitCode) process.exitCode=1;
}
