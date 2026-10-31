export type SavedOrder = { id: string; orderNumber: string; accessToken: string };
const KEY = "tea-market-order-access-v1";
export function getSavedOrders(): SavedOrder[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is SavedOrder => !!x && typeof x.id === "string" && typeof x.orderNumber === "string" && typeof x.accessToken === "string");
  } catch { return []; }
}
export function saveOrderAccess(order: SavedOrder): void {
  const entries = [order, ...getSavedOrders().filter(x => x.id !== order.id)].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(entries));
}
export function getSavedOrderAccess(id: string): string | undefined {
  return getSavedOrders().find(x => x.id === id)?.accessToken;
}
