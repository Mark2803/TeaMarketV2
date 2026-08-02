import { Router } from "express";

import {
  addCartItemController,
  getCartController,
  removeCartItemController,
  updateCartItemController
} from "./cart.controller.js";

const router = Router();

router.get(
  "/",
  getCartController
);

router.post(
  "/items",
  addCartItemController
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