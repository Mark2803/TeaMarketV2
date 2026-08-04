import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem
} from "../../shared/api/cart";

import type {
  Cart,
  CartPromo
} from "./cart.types";

import {
  clearLegacyCartStorage
} from "./cart.storage";

import {
  CART_CHANGED_EVENT,
  notifyCartChanged
} from "./cart.events";

export function useCart() {
  const [cart, setCart] =
    useState<Cart | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isMutating, setIsMutating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await getCart();
      setCart(response.data);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить корзину"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    clearLegacyCartStorage();
    void refresh();

    const handleChange = () => {
      void refresh();
    };

    window.addEventListener(
      CART_CHANGED_EVENT,
      handleChange
    );

    return () => {
      window.removeEventListener(
        CART_CHANGED_EVENT,
        handleChange
      );
    };
  }, [refresh]);

  const runMutation = useCallback(
    async (
      operation: () => Promise<{
        data: Cart;
      }>
    ) => {
      setIsMutating(true);

      try {
        const response = await operation();
        setCart(response.data);
        setError(null);
        notifyCartChanged();
        return response.data;
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Не удалось изменить корзину";

        setError(message);
        throw requestError;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const promo: CartPromo | null = null;

  return {
    cart,
    promo,
    items: cart?.items ?? [],
    totalQuantity:
      cart?.totalQuantity ?? 0,
    totalAmount: Number(
      cart?.totalAmount ?? 0
    ),
    isLoading,
    isMutating,
    error,
    refresh,
    addItem: (
      productVariantId: string,
      quantity = 1
    ) => runMutation(
      () => addCartItem(
        productVariantId,
        quantity
      )
    ),
    updateQuantity: (
      itemId: string,
      quantity: number
    ) => runMutation(
      () => updateCartItem(
        itemId,
        { quantity }
      )
    ),
    changeVariant: (
      itemId: string,
      productVariantId: string
    ) => runMutation(
      () => updateCartItem(
        itemId,
        { productVariantId }
      )
    ),
    removeItem: (itemId: string) =>
      runMutation(
        () => removeCartItem(itemId)
      ),
    clear: () => runMutation(clearCart),
    applyPromo: (code: string) => {
      void code;
      return null;
    }
  };
}
