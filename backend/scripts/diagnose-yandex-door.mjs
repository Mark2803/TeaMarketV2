// Run: node --env-file=.env scripts/diagnose-yandex-door.mjs
// Read-only API checks. Does not create or confirm shipments.
const token = process.env.YANDEX_DELIVERY_TEST_TOKEN;
if (!token) { console.error('YANDEX_DELIVERY_TEST_TOKEN is missing'); process.exit(1); }
const base = 'https://b2b.taxi.tst.yandex.net/api/b2b/platform';
const headers = { Authorization: `Bearer ${token}`, Accept:'application/json', 'Content-Type':'application/json' };
const stations = [
  ['Documented test warehouse', 'fbed3aa1-2cc6-4370-ab4d-59c5cc9bb924'],
  ['Documented Moscow seller drop-off PVZ', 'e1139f6d-e34f-47a9-a55f-31f032a861a6'],
];
const extra = process.env.YANDEX_DELIVERY_TEST_DOOR_SOURCE_STATION_ID;
if (extra && !stations.some(([,id])=>id===extra)) stations.push(['Configured door source',extra]);
const address = 'Москва, Ленинградский проспект, 37к9';
const destinationPVZ = '01946f4f013c7337874ec2fb848a58a4';
const dims = { dx:10,dy:10,dz:10,weight_gross:100 };
async function call(label,url,body) {
  try {
    const res=await fetch(url,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    const data=await res.json().catch(()=>null);
    console.log(label, 'HTTP',res.status,JSON.stringify(data));
    return {status:res.status,data};
  } catch(e) { console.log(label,'NETWORK_ERROR',e.message); return null; }
}
for (const [label,station] of stations) {
  console.log(`\nSOURCE: ${label} (${station})`);
  const url=new URL(`${base}/offers/info`);
  url.searchParams.set('station_id',station);
  url.searchParams.set('full_address',address);
  url.searchParams.set('last_mile_policy','time_interval');
  await call('door intervals GET',url);
  for (const [mode,destination] of [['door',{address}],['pickup',{platform_station_id:destinationPVZ}]]) {
    const payload={source:{platform_station_id:station},destination,tariff:mode==='door'?'time_interval':'self_pickup',total_weight:100,total_assessed_price:0,client_price:0,payment_method:'already_paid',places:[{physical_dims:dims}]};
    await call(`${mode} pricing POST`,`${base}/pricing-calculator`,payload);
  }
}
console.log('\nInterpretation: compare door and pickup responses for the same source. A 400 no_delivery_options is an availability result, not proof of an invalid request.');
