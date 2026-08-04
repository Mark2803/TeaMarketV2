import { Router } from "express";

import {
  authMiddleware
} from "./auth.middleware.js";

import {
  logoutAuthController,
  requestAuthCodeController,
  verifyAuthCodeController
} from "./auth.controller.js";

const router = Router();

router.post(
  "/request-code",
  requestAuthCodeController
);

router.post(
  "/verify-code",
  verifyAuthCodeController
);

router.post(
  "/logout",
  authMiddleware,
  logoutAuthController
);

export default router;