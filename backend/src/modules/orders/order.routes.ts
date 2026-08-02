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

const router = Router();

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