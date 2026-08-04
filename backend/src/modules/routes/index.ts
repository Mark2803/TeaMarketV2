import { Router } from "express";

import healthRouter from "./health.js";

import productsRouter from "../modules/products/products.routes.js";
import categoriesRouter from "../modules/categories/categories.routes.js";
import collectionsRouter from "../modules/collections/collections.routes.js";
import articlesRouter from "../modules/articles/articles.routes.js";
import searchRouter from "../modules/search/search.routes.js";

import cartRouter from "../modules/cart/cart.routes.js";
import ordersRouter from "../modules/orders/order.routes.js";

import deliveryMethodsRouter from "../modules/delivery-methods/delivery-methods.routes.js";
import paymentMethodsRouter from "../modules/payment-methods/payment-methods.routes.js";

import authRouter from "../modules/auth/auth.routes.js";
import profileRouter from "../modules/profile/profile.routes.js";
import favoritesRouter from "../modules/favorites/favorites.routes.js";
import customerAddressesRouter from "../modules/customer-addresses/customer-addresses.routes.js";

import moderatorRouter from "../modules/moderator/moderator.routes.js";

const router = Router();

router.use("/health", healthRouter);

router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/collections", collectionsRouter);
router.use("/articles", articlesRouter);
router.use("/search", searchRouter);

router.use("/delivery-methods", deliveryMethodsRouter);
router.use("/payment-methods", paymentMethodsRouter);

router.use("/auth", authRouter);
router.use("/profile", profileRouter);

router.use("/orders", ordersRouter);
router.use("/cart", cartRouter);

router.use("/favorites", favoritesRouter);
router.use("/customer-addresses", customerAddressesRouter);

router.use("/moderator", moderatorRouter);

export default router;