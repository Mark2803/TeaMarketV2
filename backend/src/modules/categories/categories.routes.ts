import { Router } from "express";

import {
  getCategoriesController,
  getCategoryBySlugController,
  getCategoryProductsController
} from "./categories.controller.js";

const router = Router();

router.get(
  "/",
  getCategoriesController
);

router.get(
  "/:slug/products",
  getCategoryProductsController
);

router.get(
  "/:slug",
  getCategoryBySlugController
);

export default router;