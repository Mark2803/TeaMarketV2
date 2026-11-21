import { Router } from "express";

import healthRouter from "./health.js";
import sitemapRouter from "../modules/seo/sitemap.routes.js";
import feedsRouter from "../modules/seo/feeds.routes.js";

import productsRouter from "../modules/products/products.routes.js";
import categoriesRouter from "../modules/categories/categories.routes.js";
import collectionsRouter from "../modules/collections/collections.routes.js";
import articlesRouter from "../modules/articles/articles.routes.js";
import homeBannersRouter from "../modules/home-banners/home-banners.routes.js";
import searchRouter from "../modules/search/search.routes.js";
import pricingRouter from "../modules/pricing/pricing.routes.js";
import analyticsRouter from "../modules/analytics/analytics.routes.js";

import cartRouter from "../modules/cart/cart.routes.js";
import ordersRouter from "../modules/orders/order.routes.js";
import { handleYooKassaWebhook } from "../modules/orders/yookassa-webhook.controller.js";

import deliveryMethodsRouter from "../modules/delivery-methods/delivery-methods.routes.js";
import paymentMethodsRouter from "../modules/payment-methods/payment-methods.routes.js";

import authRouter from "../modules/auth/auth.routes.js";
import profileRouter from "../modules/profile/profile.routes.js";
import favoritesRouter from "../modules/favorites/favorites.routes.js";
import customerAddressesRouter from "../modules/customer-addresses/customer-addresses.routes.js";

import moderatorRouter from "../modules/moderator/moderator.routes.js";
import { publicMessengerRouter } from "../modules/messengers/messenger.routes.js";
import yandexPickupPointsRouter from "./yandex-test-points.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/seo", sitemapRouter);
router.use("/seo", feedsRouter);

router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/collections", collectionsRouter);
router.use("/articles", articlesRouter);
router.use("/home-banners", homeBannersRouter);
router.use("/search", searchRouter);
router.use("/pricing", pricingRouter);
router.use("/analytics", analyticsRouter);

router.use("/delivery-methods", deliveryMethodsRouter);
router.use("/delivery-methods", yandexPickupPointsRouter);
router.use("/payment-methods", paymentMethodsRouter);

router.use("/auth", authRouter);
router.use("/profile", profileRouter);

// Оба адреса (/payments/yookassa/webhook и /orders/yookassa/webhook)
// обслуживает один обработчик, чтобы не расходилась логика проверки.
router.post("/payments/yookassa/webhook", handleYooKassaWebhook);
router.use("/orders", ordersRouter);
router.use("/cart", cartRouter);

router.use("/favorites", favoritesRouter);
router.use("/customer-addresses", customerAddressesRouter);

router.use("/messengers", publicMessengerRouter);
router.use("/moderator", moderatorRouter);

export default router;
