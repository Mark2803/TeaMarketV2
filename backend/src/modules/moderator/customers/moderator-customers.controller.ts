import type { Request,Response } from "express";
import { moderatorCustomersQuerySchema } from "./moderator-customers.query.js";
import { moderatorCustomerParamsSchema,updateModeratorCustomerSchema } from "./moderator-customer.schemas.js";
import { getModeratorCustomers } from "./moderator-customers.service.js";
import { deleteModeratorCustomer,getModeratorCustomer,updateModeratorCustomer } from "./moderator-customer.service.js";
export async function getModeratorCustomersController(req:Request,res:Response){const q=moderatorCustomersQuerySchema.safeParse(req.query);if(!q.success){res.status(400).json({error:{code:"INVALID_CUSTOMERS_QUERY",message:"Некорректные параметры",details:q.error.flatten()}});return}const r=await getModeratorCustomers(q.data);res.json({data:r.items,pagination:r.pagination})}
export async function getModeratorCustomerController(req:Request,res:Response){const p=moderatorCustomerParamsSchema.safeParse(req.params);if(!p.success){res.status(400).json({error:{code:"INVALID_CUSTOMER_ID",message:"Некорректный ID покупателя"}});return}const c=await getModeratorCustomer(p.data.customerId);if(!c){res.status(404).json({error:{code:"CUSTOMER_NOT_FOUND",message:"Покупатель не найден"}});return}res.json({data:c})}
export async function updateModeratorCustomerController(req:Request,res:Response){const p=moderatorCustomerParamsSchema.safeParse(req.params),b=updateModeratorCustomerSchema.safeParse(req.body);if(!p.success||!b.success){res.status(400).json({error:{code:"INVALID_CUSTOMER_DATA",message:"Некорректные данные покупателя",details:!b.success?b.error.flatten():undefined}});return}try{const c=await updateModeratorCustomer(p.data.customerId,b.data);if(!c){res.status(404).json({error:{code:"CUSTOMER_NOT_FOUND",message:"Покупатель не найден"}});return}res.json({data:c})}catch{res.status(409).json({error:{code:"CUSTOMER_CONFLICT",message:"Email уже используется другим покупателем"}})}}

export async function deleteModeratorCustomerController(req:Request,res:Response){
  const p=moderatorCustomerParamsSchema.safeParse(req.params);
  if(!p.success){res.status(400).json({error:{code:"INVALID_CUSTOMER_ID",message:"Некорректный ID покупателя"}});return}
  const result=await deleteModeratorCustomer(p.data.customerId);
  if(!result){res.status(404).json({error:{code:"CUSTOMER_NOT_FOUND",message:"Покупатель не найден"}});return}
  res.json({data:result});
}
