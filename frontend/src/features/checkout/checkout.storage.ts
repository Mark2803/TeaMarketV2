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
  customerId: string,
  draft: Omit<
    CheckoutDraft,
    "updatedAt"
  >
): void {
  localStorage.setItem(
    getKey(customerId),
    JSON.stringify({
      ...draft,
      updatedAt:
        new Date().toISOString()
    })
  );
}

export function clearCheckoutDraft(
  customerId?: string
): void {
  localStorage.removeItem(
    getKey(customerId)
  );
}
