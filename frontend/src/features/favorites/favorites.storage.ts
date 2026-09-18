export const GUEST_FAVORITES_STORAGE_KEY = "tea-market-guest-favorites";

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
}

export function getGuestFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_STORAGE_KEY);
    return raw ? normalizeIds(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function setGuestFavoriteIds(ids: string[]): void {
  localStorage.setItem(GUEST_FAVORITES_STORAGE_KEY, JSON.stringify(normalizeIds(ids)));
  window.dispatchEvent(new Event("tea-market-guest-favorites-changed"));
}

export function toggleGuestFavorite(productId: string): boolean {
  const ids = getGuestFavoriteIds();
  const exists = ids.includes(productId);
  setGuestFavoriteIds(exists ? ids.filter((id) => id !== productId) : [...ids, productId]);
  return !exists;
}

export function removeGuestFavorite(productId: string): void {
  setGuestFavoriteIds(getGuestFavoriteIds().filter((id) => id !== productId));
}

export function clearGuestFavorites(): void {
  localStorage.removeItem(GUEST_FAVORITES_STORAGE_KEY);
  window.dispatchEvent(new Event("tea-market-guest-favorites-changed"));
}
