import type {
  Request,
  Response
} from "express";

import {
  addCartItemSchema,
  cartItemParamsSchema,
  guestCartTokenSchema,
  updateCartItemSchema
} from "./cart.schemas.js";

import {
  addGuestCartItem,
  getGuestCart,
  removeGuestCartItem,
  updateGuestCartItem
} from "./cart.service.js";

function getGuestToken(
  req: Request
) {
  const tokenHeader =
    req.headers["x-guest-token"];

  const token =
    Array.isArray(tokenHeader)
      ? tokenHeader[0]
      : tokenHeader;

  return guestCartTokenSchema.safeParse(
    token
  );
}

function sendCartOperationError(
  res: Response,
  result:
    | {
        success: false;
        error:
          "PRODUCT_VARIANT_NOT_FOUND"
          | "CART_ITEM_NOT_FOUND"
          | "INSUFFICIENT_STOCK";
        availableQuantity?: number;
      }
) {
  switch (result.error) {
    case "PRODUCT_VARIANT_NOT_FOUND":
      res.status(404).json({
        error: {
          code:
            "PRODUCT_VARIANT_NOT_FOUND",

          message:
            "Вариант товара не найден или недоступен"
        }
      });

      return;

    case "CART_ITEM_NOT_FOUND":
      res.status(404).json({
        error: {
          code:
            "CART_ITEM_NOT_FOUND",

          message:
            "Позиция корзины не найдена"
        }
      });

      return;

    case "INSUFFICIENT_STOCK":
      res.status(409).json({
        error: {
          code:
            "INSUFFICIENT_STOCK",

          message:
            "Недостаточное количество товара в наличии",

          details: {
            availableQuantity:
              result.availableQuantity
          }
        }
      });
  }
}

export async function getCartController(
  req: Request,
  res: Response
): Promise<void> {
  const tokenResult =
    getGuestToken(req);

  if (!tokenResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_GUEST_TOKEN",

        message:
          "Некорректный токен гостевой корзины",

        details:
          tokenResult.error.flatten()
      }
    });

    return;
  }

  const cart =
    await getGuestCart(
      tokenResult.data
    );

  res.json({
    data: cart
  });
}

export async function addCartItemController(
  req: Request,
  res: Response
): Promise<void> {
  const tokenResult =
    getGuestToken(req);

  if (!tokenResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_GUEST_TOKEN",

        message:
          "Некорректный токен гостевой корзины",

        details:
          tokenResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    addCartItemSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_CART_ITEM_DATA",

        message:
          "Некорректные данные позиции корзины",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await addGuestCartItem(
      tokenResult.data,
      bodyResult.data
    );

  if (!result.success) {
    sendCartOperationError(
      res,
      result
    );

    return;
  }

  res.status(201).json({
    data: result.cart
  });
}

export async function updateCartItemController(
  req: Request,
  res: Response
): Promise<void> {
  const tokenResult =
    getGuestToken(req);

  if (!tokenResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_GUEST_TOKEN",

        message:
          "Некорректный токен гостевой корзины",

        details:
          tokenResult.error.flatten()
      }
    });

    return;
  }

  const paramsResult =
    cartItemParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_CART_ITEM_ID",

        message:
          "Некорректный ID позиции корзины",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const bodyResult =
    updateCartItemSchema.safeParse(
      req.body
    );

  if (!bodyResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_CART_ITEM_DATA",

        message:
          "Некорректные данные позиции корзины",

        details:
          bodyResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await updateGuestCartItem(
      tokenResult.data,
      paramsResult.data.itemId,
      bodyResult.data
    );

  if (!result.success) {
    sendCartOperationError(
      res,
      result
    );

    return;
  }

  res.json({
    data: result.cart
  });
}

export async function removeCartItemController(
  req: Request,
  res: Response
): Promise<void> {
  const tokenResult =
    getGuestToken(req);

  if (!tokenResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_GUEST_TOKEN",

        message:
          "Некорректный токен гостевой корзины",

        details:
          tokenResult.error.flatten()
      }
    });

    return;
  }

  const paramsResult =
    cartItemParamsSchema.safeParse(
      req.params
    );

  if (!paramsResult.success) {
    res.status(400).json({
      error: {
        code:
          "INVALID_CART_ITEM_ID",

        message:
          "Некорректный ID позиции корзины",

        details:
          paramsResult.error.flatten()
      }
    });

    return;
  }

  const result =
    await removeGuestCartItem(
      tokenResult.data,
      paramsResult.data.itemId
    );

  if (!result.success) {
    sendCartOperationError(
      res,
      result
    );

    return;
  }

  res.json({
    data: result.cart
  });
}