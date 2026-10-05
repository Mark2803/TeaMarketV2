import { Router } from "express";

import {
  getArticleBySlugController,
  getArticlesController,
  getDzenRssController
} from "./articles.controller.js";

const router = Router();

router.get(
  "/",
  getArticlesController
);

router.get(
  "/rss/dzen.xml",
  getDzenRssController
);

router.get(
  "/:slug",
  getArticleBySlugController
);

export default router;
