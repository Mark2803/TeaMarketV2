export interface CheckoutContact {
  name: string;
  phone: string;
  email: string;
}

export interface GuestCheckoutAddress {
  city: string;
  street: string;
  house: string;
  apartment: string;
}

export interface CheckoutDraft {
  selectedLocationId: string;
  selectedDeliveryMethodId: string;
  selectedPaymentMethodId: string;
  comment: string;
  contact?: CheckoutContact;
  guestAddress?: GuestCheckoutAddress;
  updatedAt: string;
}

export type CheckoutValidationField =
  | "recipient"
  | "location"
  | "delivery"
  | "payment";

export type CheckoutValidationErrors =
  Partial<Record<CheckoutValidationField, string>>;
