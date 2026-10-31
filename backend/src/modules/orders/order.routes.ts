import { Router } from "express";

import {
  authMiddleware
} from "../auth/auth.middleware.js";

import {
  createOrderController
} from "./order.controller.js";

import {
  getCustomerOrderByNumberController,
  getCustomerOrdersController
} from "./order-history.controller.js";

import { getAccessibleOrder, payAccessibleOrder } from "./order-access.controller.js";

const router = Router();
router.get("/access/:orderId", authMiddleware, getAccessibleOrder);
router.post("/access/:orderId/pay", authMiddleware, payAccessibleOrder);

/**
 * Создание заказа доступно гостю.
 */
router.post(
  "/",
  authMiddleware,
  createOrderController
);

/**
 * История заказов требует авторизации.
 */
router.get(
  "/my",
  authMiddleware,
  getCustomerOrdersController
);

router.get(
  "/my/:orderNumber",
  authMiddleware,
  getCustomerOrderByNumberController
);

export default router;