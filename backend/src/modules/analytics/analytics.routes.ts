import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { trackAnalyticsEventController } from "./analytics.controller.js";
const router = Router();
router.post("/events", authMiddleware, trackAnalyticsEventController);
export default router;
