import type {Request,Response} from "express";
import {prisma} from "../../database/prisma.js";
import {CarrierQuoteError,quoteYandexPickup,quoteYandexDoor} from "./yandex-carrier-quote.service.js";
export async function yandexCheckoutQuoteController(req:Request,res:Response):Promise<void>{
 const mode=req.body?.deliveryMode === "door" ? "door" : "pickup";
 const id=mode === "door" ? req.body?.destinationAddress : req.body?.destinationStationId;
 if(typeof id!=="string"){res.status(400).json({error:{code:"INVALID_DESTINATION",message:mode === "door" ? "Укажите адрес доставки" : "Выберите ПВЗ"}});return;}
 const customerId=req.customer?.id??null;
 const guestToken=String(req.headers["x-guest-token"]??"");
 if(!customerId&&!/^[0-9a-f-]{36}$/i.test(guestToken)){res.status(400).json({error:{code:"INVALID_GUEST_TOKEN",message:"Не найдена гостевая корзина"}});return;}
 const cart=await prisma.carts.findFirst({where:customerId?{customer_id:customerId,status:"active"}:{guest_token:guestToken,customer_id:null,status:"active"},include:{cart_items:{include:{product_variants:true}}}});
 if(!cart||!cart.cart_items.length){res.status(404).json({error:{code:"CART_NOT_FOUND",message:"Активная корзина не найдена"}});return;}
 try{const lines=cart.cart_items.map(i=>({sku:i.product_variants.sku,quantity:i.quantity}));const q=mode === "door" ? await quoteYandexDoor(lines,id) : await quoteYandexPickup(lines,id);res.json({data:q});}
 catch(e){const err=e instanceof CarrierQuoteError?e:new CarrierQuoteError("YANDEX_UNAVAILABLE","Ошибка расчёта Яндекс Доставки");res.status(422).json({error:{code:err.code,message:err.message}});}
}
