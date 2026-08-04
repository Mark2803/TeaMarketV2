/**
 * Устаревшее локальное хранилище корзины отключено.
 * Содержимое корзины теперь хранится только в PostgreSQL.
 */
const LEGACY_CART_KEYS = [
  "tea-market-test-cart",
  "tea-market-test-cart-promo"
];

export function clearLegacyCartStorage() {
  for (const key of LEGACY_CART_KEYS) {
    localStorage.removeItem(key);
  }
}
