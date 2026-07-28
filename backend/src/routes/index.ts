import { Router } from "express";

import categoriesRouter from "../modules/categories/categories.routes.js";
import collectionsRouter from "../modules/collections/collections.routes.js";
import productsRouter from "../modules/products/products.routes.js";
import healthRouter from "./health.js";
import searchRouter from "../modules/search/search.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/collections", collectionsRouter);
router.use("/search", searchRouter);

export default router;