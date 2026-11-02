import { Router } from "express";
import { getDeliveryMethodsController, getDeliveryQuoteController } from "./delivery-methods.controller.js";

import { yandexCheckoutQuoteController } from "./yandex-checkout-quote.controller.js";
const router = Router();
router.get("/", getDeliveryMethodsController);
router.post("/quote", getDeliveryQuoteController);
router.post("/yandex-quote", yandexCheckoutQuoteController);
export default router;
