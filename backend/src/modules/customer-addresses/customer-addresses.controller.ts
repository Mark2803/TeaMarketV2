import type { Request, Response } from "express";
import { addressBodySchema, updateAddressBodySchema } from "./customer-addresses.schemas.js";
import { createAddress, deleteAddress, listAddresses, updateAddress } from "./customer-addresses.service.js";

function customerId(req: Request, res: Response) {
  const id=req.customer?.id;
  if (!id) res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Требуется авторизация" } });
  return id ?? null;
}
export async function list(req: Request,res: Response){ const id=customerId(req,res); if(!id)return; res.json({data:await listAddresses(id)}); }
export async function create(req: Request,res: Response){ const id=customerId(req,res); if(!id)return; const p=addressBodySchema.safeParse(req.body); if(!p.success){res.status(400).json({error:{code:"INVALID_ADDRESS",message:"Некорректный адрес",details:p.error.flatten()}});return;} res.status(201).json({data:await createAddress(id,p.data)}); }
export async function update(req: Request,res: Response){ const id=customerId(req,res); if(!id)return; const p=updateAddressBodySchema.safeParse(req.body); if(!p.success){res.status(400).json({error:{code:"INVALID_ADDRESS",message:"Некорректный адрес",details:p.error.flatten()}});return;} const addressId = String(req.params.id ?? ""); const row=await updateAddress(id,addressId,p.data); if(!row){res.status(404).json({error:{code:"ADDRESS_NOT_FOUND",message:"Адрес не найден"}});return;} res.json({data:row}); }
export async function remove(req: Request,res: Response){ const id=customerId(req,res); if(!id)return; const addressId = String(req.params.id ?? ""); const ok=await deleteAddress(id,addressId); if(!ok){res.status(404).json({error:{code:"ADDRESS_NOT_FOUND",message:"Адрес не найден"}});return;} res.status(204).send(); }
