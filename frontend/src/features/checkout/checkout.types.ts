export interface CheckoutDraft {
  selectedLocationId: string;
  selectedDeliveryMethodId: string;
  selectedPaymentMethodId: string;
  comment: string;
  updatedAt: string;
}

export type CheckoutValidationField =
  | "recipient"
  | "location"
  | "delivery"
  | "payment";

export type CheckoutValidationErrors =
  Partial<Record<CheckoutValidationField, string>>;
