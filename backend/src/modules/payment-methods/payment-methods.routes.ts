import { Router } from "express";

import {
  getPaymentMethodsController
} from "./payment-methods.controller.js";

const router = Router();

router.get(
  "/",
  getPaymentMethodsController
);

export default router;