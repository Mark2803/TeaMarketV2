import type {
  Request,
  Response
} from "express";

import {
  getCustomerOrderByNumber,
  getCustomerOrders
} from "./order-history.service.js";

function getAuthorizedCustomerId(
  req: Request,
  res: Response
) {
  const customerId =
    req.customer?.id;

  if (!customerId) {
    res.status(401).json({
      error: {
        code:
          "UNAUTHORIZED",

        message:
          "Требуется авторизация"
      }
    });

    return null;
  }

  return customerId;
}

export async function getCustomerOrdersController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const orders =
    await getCustomerOrders(
      customerId
    );

  res.json({
    data: orders
  });
}

export async function getCustomerOrderByNumberController(
  req: Request,
  res: Response
): Promise<void> {
  const customerId =
    getAuthorizedCustomerId(
      req,
      res
    );

  if (!customerId) {
    return;
  }

  const orderNumberParam =
    req.params.orderNumber;

  const orderNumber =
    Array.isArray(orderNumberParam)
      ? orderNumberParam[0]
      : orderNumberParam;

  if (!orderNumber) {
    res.status(400).json({
      error: {
        code:
          "INVALID_ORDER_NUMBER",

        message:
          "Номер заказа не указан"
      }
    });

    return;
  }

  const order =
    await getCustomerOrderByNumber(
      customerId,
      orderNumber
    );

  if (!order) {
    res.status(404).json({
      error: {
        code:
          "ORDER_NOT_FOUND",

        message:
          "Заказ не найден"
      }
    });

    return;
  }

  res.json({
    data: order
  });
}