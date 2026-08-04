export const CART_CHANGED_EVENT =
  "tea-market-server-cart-change";

export function notifyCartChanged(): void {
  window.dispatchEvent(
    new CustomEvent(
      CART_CHANGED_EVENT
    )
  );
}
