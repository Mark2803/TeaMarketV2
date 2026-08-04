import type {
  AuthUser
} from "../auth/auth.types";

import type {
  DeliveryLocation
} from "../delivery/delivery.types";

import type {
  CheckoutValidationErrors
} from "./checkout.types";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CheckoutValidationInput {
  user: AuthUser | null;
  selectedLocation: DeliveryLocation | null;
  selectedDeliveryMethodId: string;
  selectedPaymentMethodId: string;
}

export function validateCheckout(
  input: CheckoutValidationInput
): CheckoutValidationErrors {
  const errors:
    CheckoutValidationErrors = {};

  if (
    !input.user
    || !input.user.profileCompleted
    || !input.user.name.trim()
    || input.user.phone
      .replace(/\D/g, "")
      .length < 10
  ) {
    errors.recipient =
      "Заполните имя и подтверждённый телефон в Профиле.";
  } else if (
    input.user.email
    && !EMAIL_PATTERN.test(
      input.user.email.trim()
    )
  ) {
    errors.recipient =
      "В Профиле указан некорректный электронный адрес.";
  }

  if (
    !input.selectedLocation
    || input.selectedLocation.type
      !== "courier"
  ) {
    errors.location =
      "Выберите сохранённый адрес курьерской доставки.";
  }

  if (!input.selectedDeliveryMethodId) {
    errors.delivery =
      "Выберите доступный способ доставки.";
  }

  if (!input.selectedPaymentMethodId) {
    errors.payment =
      "Выберите способ оплаты.";
  }

  return errors;
}

export function hasCheckoutErrors(
  errors: CheckoutValidationErrors
): boolean {
  return Object.keys(errors).length > 0;
}
