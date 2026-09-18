import { Router } from "express";
import { getDeliveryMethodsController, getDeliveryQuoteController } from "./delivery-methods.controller.js";

const router = Router();
router.get("/", getDeliveryMethodsController);
router.post("/quote", getDeliveryQuoteController);
export default router;
