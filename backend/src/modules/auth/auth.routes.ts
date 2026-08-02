import { Router } from "express";

import {
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

export default router;