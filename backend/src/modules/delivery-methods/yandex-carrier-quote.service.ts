import { calculateItemsPacking } from "../moderator/order-packing.service.js";

export class CarrierQuoteError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
export async function quoteYandexPickup(lines: ReadonlyArray<{sku:string;quantity:number}>, destinationStationId:string) {
  return quoteYandexCarrier(lines, {stationId: destinationStationId});
}

export async function quoteYandexDoor(lines: ReadonlyArray<{sku:string;quantity:number}>, destinationAddress:string) {
  const address = destinationAddress.trim();
  if (address.length < 12 || address.length > 300) throw new CarrierQuoteError("INVALID_ADDRESS", "Укажите полный адрес доставки: город, улицу и дом");
  return quoteYandexCarrier(lines, {address});
}

async function quoteYandexCarrier(lines: ReadonlyArray<{sku:string;quantity:number}>, destination:{stationId:string}|{address:string}) {
  const destinationStationId = "stationId" in destination ? destination.stationId : null;
  if (destinationStationId !== null && !/^[a-zA-Z0-9-]{20,80}$/.test(destinationStationId)) throw new CarrierQuoteError("INVALID_DESTINATION", "Некорректный идентификатор ПВЗ");
  const token = process.env.YANDEX_DELIVERY_TOKEN;
  if (!token) throw new CarrierQuoteError("YANDEX_NOT_CONFIGURED", "Боевой API Яндекс Доставки не настроен");
  const packing = await calculateItemsPacking(lines);
  if (packing.status !== "calculated" || !packing.parcels.length) throw new CarrierQuoteError("PACKING_UNAVAILABLE", `Не удалось подобрать упаковку: ${packing.status}`);
  const places = packing.parcels.map(parcel => {
    return {physical_dims:{
      dx: Math.ceil(Number(parcel.dimensions_cm[0])),
      dy: Math.ceil(Number(parcel.dimensions_cm[1])),
      dz: Math.ceil(Number(parcel.dimensions_cm[2])),
      weight_gross: Math.ceil(parcel.weight_g)
    }};
  });
  const totalWeight = places.reduce((sum,p)=>sum+p.physical_dims.weight_gross,0);
  const source = process.env.YANDEX_DELIVERY_SOURCE_STATION_ID?.trim();
  if (!source) throw new CarrierQuoteError("SOURCE_MISSING", "Укажите станцию отправителя Яндекс Доставки");
  // Do not reject door addresses locally by a string prefix: the full address
  // may include a country or region before the city. The Yandex API
  // decides whether the complete address is serviceable.
  const requestBody = {source:{platform_station_id:source},destination:destinationStationId !== null ? {platform_station_id:destinationStationId} : {address:(destination as {address:string}).address},tariff:destinationStationId !== null ? "self_pickup" : "time_interval",total_weight:totalWeight,total_assessed_price:0,client_price:0,payment_method:"already_paid",places};
  const diagnosticId = `quote-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  console.info("[YANDEX_QUOTE_REQUEST]", JSON.stringify({diagnosticId,body:requestBody}));
  let response:Response;
  const startedAt = Date.now();
  try {response=await fetch("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/pricing-calculator",{
    method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Accept-Language":"ru"},
    body:JSON.stringify(requestBody),
    signal:AbortSignal.timeout(15000)
  });}catch(error){
    console.error("[YANDEX_QUOTE_NETWORK_ERROR]",JSON.stringify({diagnosticId,elapsedMs:Date.now()-startedAt,error:error instanceof Error?error.message:String(error)}));
    throw new CarrierQuoteError("YANDEX_UNAVAILABLE","Яндекс Доставка временно недоступна");
  }
  const raw:unknown=await response.json().catch(()=>null);
  const result=raw && typeof raw==="object" ? raw as Record<string,unknown> : {};
  console.info("[YANDEX_QUOTE_RESPONSE]",JSON.stringify({diagnosticId,status:response.status,elapsedMs:Date.now()-startedAt,body:result}));
  if(!response.ok){const code=typeof result.code==="string"?result.code:"YANDEX_QUOTE_FAILED";throw new CarrierQuoteError(code,code==="no_delivery_options"?(destinationStationId !== null ? "Яндекс не предлагает доставку в выбранный ПВЗ" : "Курьерская доставка по указанному адресу сейчас недоступна"):"Яндекс не подтвердил стоимость доставки");}
  // The sandbox returns pricing_total as e.g. "181.78 RUB".
  // Accept numeric amounts and structured amounts, but reject other currencies.
  const total = result.pricing_total;
  const value = total !== null && typeof total === "object"
    ? (total as Record<string,unknown>).amount ?? (total as Record<string,unknown>).value
    : total;
  let amount = Number.NaN;
  if (typeof value === "number") {
    amount = value;
  } else if (typeof value === "string") {
    const match = /^\s*(\d+(?:[.,]\d{1,2})?)\s*(RUB|₽)?\s*$/i.exec(value);
if (match?.[1] !== undefined) {
  amount = Number(match[1].replace(",", "."));
}
  }
  if (!Number.isFinite(amount) || amount < 0) {
    console.error("[YANDEX_QUOTE_INVALID_PRICE]", JSON.stringify({diagnosticId,pricing_total:total}));
    throw new CarrierQuoteError("YANDEX_PRICE_INVALID", "Яндекс вернул некорректную стоимость доставки");
  }
  return {price:Math.round(amount*100)/100,deliveryDays:result.delivery_days??null,parcels:packing.parcels.map(p=>({code:p.code,dimensionsCm:p.dimensions_cm,weightG:p.weight_g})),totalWeightG:totalWeight,destinationStationId,deliveryMode:destinationStationId !== null ? "pickup" as const : "door" as const,source:"yandex_live" as const};
}
