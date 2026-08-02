import { Router } from "express";

import {
  moderatorAuthMiddleware
} from "./moderator-auth.middleware.js";

import {
  getModeratorOrderController
} from "./moderator-order-details.controller.js";

import {
  updateModeratorOrderStatusController
} from "./moderator-order.controller.js";

import {
  getModeratorOrdersController
} from "./moderator-orders.controller.js";

import {
  updateModeratorDeliveryController
} from "./moderator-delivery.controller.js";

import {
  updateModeratorPaymentController
} from "./moderator-payment.controller.js";

import {
  createModeratorProductController
} from "./moderator-product-create.controller.js";

import {
  createModeratorProductVariantController
} from "./moderator-product-variant-create.controller.js";

import {
  updateModeratorProductController
} from "./moderator-product-update.controller.js";

import {
  updateModeratorProductVariantController
} from "./moderator-product-variant-update.controller.js";

import {
  deleteModeratorProductVariantController
} from "./moderator-product-variant-delete.controller.js";

import {
  deleteModeratorProductController
} from "./moderator-product-delete.controller.js";

import {
  getModeratorProductsController
} from "./moderator-products.controller.js";

import {
  getModeratorProductByIdController
} from "./products/moderator-product-details.controller.js";

import {
  upsertModeratorProductCategoryController
} from "./products/moderator-product-category-upsert.controller.js";

import {
  deleteModeratorProductCategoryController
} from "./products/moderator-product-category-delete.controller.js";

import {
  upsertModeratorProductCollectionController
} from "./products/moderator-product-collection-upsert.controller.js";

import {
  deleteModeratorProductCollectionController
} from "./products/moderator-product-collection-delete.controller.js";

import {
  upsertModeratorProductRelationController
} from "./products/moderator-product-relation-upsert.controller.js";

import {
  deleteModeratorProductRelationController
} from "./products/moderator-product-relation-delete.controller.js";

import {
  createModeratorProductImageController
} from "./products/moderator-product-image-create.controller.js";

import {
  updateModeratorProductImageController
} from "./products/moderator-product-image-update.controller.js";

import {
  deleteModeratorProductImageController
} from "./products/moderator-product-image-delete.controller.js";

import {
  createModeratorCategoryController
} from "./categories/moderator-category-create.controller.js";

import {
  getModeratorCategoriesController
} from "./categories/moderator-categories.controller.js";

import {
  getModeratorCategoryByIdController
} from "./categories/moderator-category-details.controller.js";

import {
  updateModeratorCategoryController
} from "./categories/moderator-category-update.controller.js";

import {
  deleteModeratorCategoryController
} from "./categories/moderator-category-delete.controller.js";

import {
  createModeratorCollectionController
} from "./collections/moderator-collection-create.controller.js";

import {
  getModeratorCollectionsController
} from "./collections/moderator-collections.controller.js";

import {
  getModeratorCollectionByIdController
} from "./collections/moderator-collection-details.controller.js";

import {
  updateModeratorCollectionController
} from "./collections/moderator-collection-update.controller.js";

import {
  deleteModeratorCollectionController
} from "./collections/moderator-collection-delete.controller.js";

import {
  uploadProductImage
} from "../../middleware/upload-image.middleware.js";

import {
  uploadModeratorProductImageController
} from "./products/moderator-product-image-upload.controller.js";

import {
  replaceModeratorProductImageController
} from "./products/moderator-product-image-replace.controller.js";

const router = Router();

router.use(
  moderatorAuthMiddleware
);

router.get(
  "/orders",
  getModeratorOrdersController
);

router.get(
  "/orders/:orderNumber",
  getModeratorOrderController
);

router.patch(
  "/orders/:orderNumber/status",
  updateModeratorOrderStatusController
);

router.patch(
  "/orders/:orderNumber/delivery",
  updateModeratorDeliveryController
);

router.patch(
  "/orders/:orderNumber/payment",
  updateModeratorPaymentController
);

router.post(
  "/products",
  createModeratorProductController
);

router.post(
  "/products/:productId/variants",
  createModeratorProductVariantController
);

router.patch(
  "/products/:productId",
  updateModeratorProductController
);

router.patch(
  "/products/:productId/variants/:variantId",
  updateModeratorProductVariantController
);

router.delete(
  "/products/:productId/variants/:variantId",
  deleteModeratorProductVariantController
);

router.delete(
  "/products/:productId",
  deleteModeratorProductController
);

router.get(
  "/products",
  getModeratorProductsController
);

router.get(
  "/products/:productId",
  getModeratorProductByIdController
);

router.put(
  "/products/:productId/categories/:categoryId",
  upsertModeratorProductCategoryController
);

router.delete(
  "/products/:productId/categories/:categoryId",
  deleteModeratorProductCategoryController
);

router.put(
  "/products/:productId/collections/:collectionId",
  upsertModeratorProductCollectionController
);

router.delete(
  "/products/:productId/collections/:collectionId",
  deleteModeratorProductCollectionController
);

router.put(
  "/products/:productId/relations/:relatedProductId",
  upsertModeratorProductRelationController
);

router.delete(
  "/products/:productId/relations/:relatedProductId",
  deleteModeratorProductRelationController
);

router.post(
  "/products/:productId/images",
  createModeratorProductImageController
);

router.patch(
  "/products/:productId/images/:imageId",
  updateModeratorProductImageController
);

router.delete(
  "/products/:productId/images/:imageId",
  deleteModeratorProductImageController
);

router.post(
  "/categories",
  createModeratorCategoryController
);

router.get(
  "/categories",
  getModeratorCategoriesController
);

router.get(
  "/categories/:categoryId",
  getModeratorCategoryByIdController
);

router.patch(
  "/categories/:categoryId",
  updateModeratorCategoryController
);

router.delete(
  "/categories/:categoryId",
  deleteModeratorCategoryController
);

router.post(
  "/collections",
  createModeratorCollectionController
);

router.get(
  "/collections",
  getModeratorCollectionsController
);

router.get(
  "/collections/:collectionId",
  getModeratorCollectionByIdController
);

router.patch(
  "/collections/:collectionId",
  updateModeratorCollectionController
);

router.delete(
  "/collections/:collectionId",
  deleteModeratorCollectionController
);

router.post(
  "/products/:productId/images/upload",
  uploadProductImage,
  uploadModeratorProductImageController
);

router.put(
  "/products/:productId/images/:imageId/file",
  uploadProductImage,
  replaceModeratorProductImageController
);

export default router;