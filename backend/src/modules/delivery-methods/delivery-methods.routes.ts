import { Router } from "express";

import {
  getDeliveryMethodsController
} from "./delivery-methods.controller.js";

const router = Router();

router.get(
  "/",
  getDeliveryMethodsController
);

export default router;