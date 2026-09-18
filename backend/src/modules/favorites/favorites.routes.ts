import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  addFavoriteController,
  getFavoritesController,
  mergeFavoritesController,
  removeFavoriteController,
  resolveFavoritesController
} from "./favorites.controller.js";

const router = Router();

// Гостевой endpoint: читает только публичные данные товаров, ничего не пишет в БД.
router.post("/resolve", resolveFavoritesController);

router.use(authMiddleware);
router.get("/", getFavoritesController);
router.post("/merge", mergeFavoritesController);
router.post("/:productId", addFavoriteController);
router.delete("/:productId", removeFavoriteController);

export default router;
