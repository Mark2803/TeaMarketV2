import { Router } from "express";

import {
  listHomeBannersController
} from "./home-banners.controller.js";

const router = Router();

router.get(
  "/",
  listHomeBannersController
);

export default router;
