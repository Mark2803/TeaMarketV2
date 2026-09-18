import type {
  CheckoutDraft
} from "./checkout.types";

const KEY_PREFIX =
  "tea-market-checkout-draft";

function getKey(
  customerId?: string
): string {
  return customerId
    ? `${KEY_PREFIX}:${customerId}`
    : KEY_PREFIX;
}

export function readCheckoutDraft(
  customerId?: string
): CheckoutDraft | null {
  try {
    const raw =
      localStorage.getItem(
        getKey(customerId)
      );

    if (!raw) {
      return null;
    }

    const value =
      JSON.parse(raw) as
        Partial<CheckoutDraft>;

    return {
      selectedLocationId:
        typeof value.selectedLocationId
          === "string"
          ? value.selectedLocationId
          : "",

      selectedDeliveryMethodId:
        typeof value.selectedDeliveryMethodId
          === "string"
          ? value.selectedDeliveryMethodId
          : "",

      selectedPaymentMethodId:
        typeof value.selectedPaymentMethodId
          === "string"
          ? value.selectedPaymentMethodId
          : "",

      comment:
        typeof value.comment === "string"
          ? value.comment
          : "",

      contact: value.contact && typeof value.contact === "object" ? {
        name: typeof value.contact.name === "string" ? value.contact.name : "",
        phone: typeof value.contact.phone === "string" ? value.contact.phone : "",
        email: typeof value.contact.email === "string" ? value.contact.email : ""
      } : undefined,
      guestAddress: value.guestAddress && typeof value.guestAddress === "object" ? {
        city: typeof value.guestAddress.city === "string" ? value.guestAddress.city : "",
        street: typeof value.guestAddress.street === "string" ? value.guestAddress.street : "",
        house: typeof value.guestAddress.house === "string" ? value.guestAddress.house : "",
        apartment: typeof value.guestAddress.apartment === "string" ? value.guestAddress.apartment : ""
      } : undefined,
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(
  customerId: string | undefined,
  draft: Omit<CheckoutDraft, "updatedAt">
): void {
  try {
    localStorage.setItem(
      getKey(customerId),
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Недоступность хранилища черновика не блокирует оформление.
  }
}

export function clearCheckoutDraft(customerId?: string): void {
  try {
    localStorage.removeItem(getKey(customerId));
  } catch {
    // Заказ уже создан; ошибка очистки не должна скрывать результат.
  }
}
