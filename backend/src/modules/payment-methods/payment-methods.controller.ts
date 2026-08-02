import type {
  Request,
  Response
} from "express";

import {
  getActivePaymentMethods
} from "./payment-methods.service.js";

export async function getPaymentMethodsController(
  _req: Request,
  res: Response
): Promise<void> {
  const paymentMethods =
    await getActivePaymentMethods();

  res.json({
    data:
      paymentMethods.map(
        (method) => ({
          id:
            method.id,

          name:
            method.name
        })
      )
  });
}