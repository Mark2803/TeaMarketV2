/**
 * Содержимое Избранного больше не хранится во frontend.
 * Источник истины — таблица favorites через /api/favorites.
 */
export const LEGACY_FAVORITES_STORAGE_KEY =
  "tea-market-favorites";

export function clearLegacyFavoritesStorage(): void {
  localStorage.removeItem(
    LEGACY_FAVORITES_STORAGE_KEY
  );
}
