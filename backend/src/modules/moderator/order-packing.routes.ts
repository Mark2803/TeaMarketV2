import { Router } from "express";
import { calculateOrderPacking, getSavedOrderPacking, saveOrderPacking } from "./order-packing.service.js";
const router=Router();
const respond=(e:unknown,res:any,next:any)=>{
  if(e instanceof Error && /^(ORDER_NOT_FOUND|INVALID_|PACKAGE_|PACKING_)/.test(e.message)){
    res.status(e.message==="ORDER_NOT_FOUND"?404:400).json({error:{code:e.message,message:e.message}});return;
  }
  next(e);
};
router.get("/:orderNumber",async(req,res,next)=>{try{
  res.json({data:await calculateOrderPacking(String(req.params.orderNumber)),saved:await getSavedOrderPacking(String(req.params.orderNumber))});
}catch(e){respond(e,res,next)}});
router.post("/:orderNumber",async(req,res,next)=>{try{
  const id=(req.body as {packageId?:unknown}|undefined)?.packageId;
  if(id!==undefined && (typeof id!=="string" || !/^[0-9a-f-]{36}$/i.test(id))){res.status(400).json({error:{code:"INVALID_PACKAGE_ID"}});return;}
  res.json({data:await saveOrderPacking(String(req.params.orderNumber),typeof id==="string"?id:undefined)});
}catch(e){respond(e,res,next)}});
export default router;
