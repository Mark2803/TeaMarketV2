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
  addCartItem,
  clearCart,
  getCart,
  mergeGuestCart,
  removeCartItem,
  updateCartItem
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

function getCartOwner(
  req: Request,
  res: Response
) {
  if (req.customer) {
    return {
      customerId:
        req.customer.id
    } as const;
  }

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

    return null;
  }

  return {
    guestToken:
      tokenResult.data
  } as const;
}

function sendCartOperationError(
  res: Response,
  result: {
    success: false;
    error:
      | "PRODUCT_VARIANT_NOT_FOUND"
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
  const owner =
    getCartOwner(req, res);

  if (!owner) {
    return;
  }

  const cart =
    await getCart(owner);

  res.json({ data: cart });
}

export async function addCartItemController(
  req: Request,
  res: Response
): Promise<void> {
  const owner =
    getCartOwner(req, res);

  if (!owner) {
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
    await addCartItem(
      owner,
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
  const owner =
    getCartOwner(req, res);

  if (!owner) {
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
    await updateCartItem(
      owner,
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

  res.json({ data: result.cart });
}

export async function removeCartItemController(
  req: Request,
  res: Response
): Promise<void> {
  const owner =
    getCartOwner(req, res);

  if (!owner) {
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
    await removeCartItem(
      owner,
      paramsResult.data.itemId
    );

  if (!result.success) {
    sendCartOperationError(
      res,
      result
    );
    return;
  }

  res.json({ data: result.cart });
}

export async function clearCartController(
  req: Request,
  res: Response
): Promise<void> {
  const owner =
    getCartOwner(req, res);

  if (!owner) {
    return;
  }

  const cart =
    await clearCart(owner);

  res.json({ data: cart });
}

export async function mergeCartController(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.customer) {
    res.status(401).json({
      error: {
        code:
          "AUTH_REQUIRED",
        message:
          "Для объединения корзины требуется авторизация"
      }
    });
    return;
  }

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
    await mergeGuestCart(
      req.customer.id,
      tokenResult.data
    );

  res.json({ data: cart });
}
