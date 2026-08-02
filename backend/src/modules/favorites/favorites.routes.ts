import { Router } from "express";

import {
  authMiddleware
} from "../auth/auth.middleware.js";

import {
  addFavoriteController,
  getFavoritesController,
  removeFavoriteController
} from "./favorites.controller.js";

const router = Router();

router.use(
  authMiddleware
);

router.get(
  "/",
  getFavoritesController
);

router.post(
  "/:productId",
  addFavoriteController
);

router.delete(
  "/:productId",
  removeFavoriteController
);

export default router;