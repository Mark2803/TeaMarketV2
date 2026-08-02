import type {
  Request,
  Response
} from "express";

import {
  getActiveDeliveryMethods
} from "./delivery-methods.service.js";

export async function getDeliveryMethodsController(
  _req: Request,
  res: Response
): Promise<void> {
  const deliveryMethods =
    await getActiveDeliveryMethods();

  res.json({
    data:
      deliveryMethods.map(
        (method) => ({
          id:
            method.id,

          name:
            method.name,

          baseCost:
            method.base_cost,

          deliveryTerm:
            method.delivery_term
        })
      )
  });
}