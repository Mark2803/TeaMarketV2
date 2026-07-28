import { Router } from "express";

import {
  searchProductsController
} from "./search.controller.js";

const router = Router();

router.get(
  "/",
  searchProductsController
);

export default router;