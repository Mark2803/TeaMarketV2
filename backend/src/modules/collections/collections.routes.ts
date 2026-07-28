import { Router } from "express";

import {
  getCollectionBySlugController,
  getCollectionProductsController,
  getCollectionsController
} from "./collections.controller.js";

const router = Router();

router.get(
  "/",
  getCollectionsController
);

router.get(
  "/:slug/products",
  getCollectionProductsController
);

router.get(
  "/:slug",
  getCollectionBySlugController
);

export default router;