import { Router } from "express";
import { securityRateLimit } from "../../middleware/security-rate-limit.js";

import {
  authMiddleware
} from "./auth.middleware.js";

import {
  logoutAuthController,
  requestAuthCodeController,
  verifyAuthCodeController
} from "./auth.controller.js";

const router = Router();

// Limits are intentionally generous for shared networks, but stop automated floods.
const requestCodeByIp = securityRateLimit({
  name: "auth-code-request-ip", max: 30, windowMs: 15 * 60_000
});
const verifyCodeByIp = securityRateLimit({
  name: "auth-code-verify-ip", max: 90, windowMs: 15 * 60_000
});


router.post(
  "/request-code",
  requestCodeByIp,
  requestAuthCodeController
);

router.post(
  "/verify-code",
  verifyCodeByIp,
  verifyAuthCodeController
);

router.post(
  "/logout",
  authMiddleware,
  logoutAuthController
);

export default router;