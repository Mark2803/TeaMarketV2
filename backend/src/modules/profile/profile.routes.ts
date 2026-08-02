import { Router } from "express";

import {
  authMiddleware
} from "../auth/auth.middleware.js";

import {
  getProfileController,
  updateProfileController
} from "./profile.controller.js";

const router = Router();

/*
 * Все маршруты профиля
 * требуют авторизации.
 */
router.use(
  authMiddleware
);

router.get(
  "/me",
  getProfileController
);

router.patch(
  "/me",
  updateProfileController
);

export default router;