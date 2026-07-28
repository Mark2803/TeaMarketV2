import { Router } from "express";

import {
  getProductBySlugController,
  getProductsController
} from "./products.controller.js";

const router = Router();

router.get("/", getProductsController);
router.get("/:slug", getProductBySlugController);

export default router;