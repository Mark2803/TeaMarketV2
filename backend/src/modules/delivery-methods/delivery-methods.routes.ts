import { Router } from "express";
import { getDeliveryMethodsController } from "./delivery-methods.controller.js";
import { yandexCheckoutQuoteController } from "./yandex-checkout-quote.controller.js";
import { yandexPickupPointsController } from "./yandex-pickup-points.controller.js";

const router = Router();
router.get("/", getDeliveryMethodsController);
router.get("/yandex-points", yandexPickupPointsController);
router.post("/yandex-quote", yandexCheckoutQuoteController);
export default router;
