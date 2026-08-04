import { Router } from "express";

import {
  authMiddleware
} from "../auth/auth.middleware.js";

import {
  addCartItemController,
  clearCartController,
  getCartController,
  mergeCartController,
  removeCartItemController,
  updateCartItemController
} from "./cart.controller.js";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  getCartController
);

router.post(
  "/merge",
  mergeCartController
);

router.post(
  "/items",
  addCartItemController
);

router.delete(
  "/items",
  clearCartController
);

router.patch(
  "/items/:itemId",
  updateCartItemController
);

router.delete(
  "/items/:itemId",
  removeCartItemController
);

export default router;
