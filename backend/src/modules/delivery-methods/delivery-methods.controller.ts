import type { Request, Response } from "express";
import { getActiveDeliveryMethods, calculateDeliveryQuote } from "./delivery-methods.service.js";
import { deliveryQuoteSchema } from "./delivery-methods.schemas.js";

export async function getDeliveryMethodsController(_req: Request, res: Response): Promise<void> {
  const deliveryMethods = await getActiveDeliveryMethods();
  res.json({
    data: deliveryMethods.map((method) => ({
      id: method.id,
      name: method.name,
      baseCost: method.base_cost,
      deliveryTerm: method.delivery_term
    }))
  });
}

export async function getDeliveryQuoteController(req: Request, res: Response): Promise<void> {
  const parsed = deliveryQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? "Некорректные данные доставки" } });
    return;
  }
  const quote = await calculateDeliveryQuote(parsed.data.deliveryMethodId, parsed.data.fullAddress);
  if (!quote) {
    res.status(404).json({ error: { message: "Способ доставки не найден или недоступен" } });
    return;
  }
  res.json({ data: quote });
}
