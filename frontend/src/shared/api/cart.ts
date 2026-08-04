import {
  apiRequest
} from "./client";

import type {
  CartResponse
} from "../../features/cart/cart.types";

import {
  getAuthHeaders
} from "../../features/auth/auth.storage";

import {
  getGuestCartToken
} from "../../features/cart/cart.token";

function getCartHeaders() {
  return {
    ...getAuthHeaders(),
    "x-guest-token":
      getGuestCartToken()
  };
}

export function getCart(): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    "/cart",
    {
      headers: getCartHeaders()
    }
  );
}

export function mergeGuestCart(): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    "/cart/merge",
    {
      method: "POST",
      headers: getCartHeaders()
    }
  );
}

export function addCartItem(
  productVariantId: string,
  quantity = 1
): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    "/cart/items",
    {
      method: "POST",
      headers: getCartHeaders(),
      body: JSON.stringify({
        productVariantId,
        quantity
      })
    }
  );
}

export function updateCartItem(
  itemId: string,
  data: {
    quantity?: number;
    productVariantId?: string;
  }
): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: getCartHeaders(),
      body: JSON.stringify(data)
    }
  );
}

export function removeCartItem(
  itemId: string
): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: getCartHeaders()
    }
  );
}

export function clearCart(): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    "/cart/items",
    {
      method: "DELETE",
      headers: getCartHeaders()
    }
  );
}
