import type { DeliveryLocation } from "../delivery/delivery.types";
import type { CheckoutContact, CheckoutValidationErrors } from "./checkout.types";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CheckoutValidationInput {
  user: CheckoutContact | null;
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
    || input.user.name.trim().length < 2
    || input.user.name.trim().length > 255
    || input.user.phone
      .replace(/\D/g, "")
      .length < 10
    || input.user.phone.replace(/\D/g, "").length > 15
    || !/^[+\d\s()\-]+$/.test(input.user.phone)
  ) {
    errors.recipient =
      "Укажите имя (от 2 символов) и телефон (10–15 цифр).";
  } else if (
    input.user.email
    && !EMAIL_PATTERN.test(
      input.user.email.trim()
    )
  ) {
    errors.recipient =
      "Укажите корректный электронный адрес.";
  }

  if (
    !input.selectedLocation
    || input.selectedLocation.type
      !== "courier"
    || !input.selectedLocation.city.trim()
    || !input.selectedLocation.street.trim()
    || !input.selectedLocation.house.trim()
    || input.selectedLocation.recipient.name.trim().length < 2
    || input.selectedLocation.recipient.phone.replace(/\D/g, "").length < 10
  ) {
    errors.location =
      "Укажите город, улицу, дом и данные получателя.";
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
