import { trackAnalyticsEvent } from "../features/analytics/analytics";
import {
  Check,
  ChevronLeft,
  CreditCard,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Truck,
  UserRound
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Link,
  Navigate
} from "react-router-dom";

import {
  useAuth
} from "../features/auth/AuthProvider";

import {
  notifyCartChanged
} from "../features/cart/cart.events";

import {
  useCart
} from "../features/cart/useCart";

import {
  clearCheckoutDraft,
  readCheckoutDraft,
  saveCheckoutDraft
} from "../features/checkout/checkout.storage";

import type {
  CheckoutContact,
  GuestCheckoutAddress,
  CheckoutValidationErrors,
  CheckoutValidationField
} from "../features/checkout/checkout.types";

import {
  hasCheckoutErrors,
  validateCheckout
} from "../features/checkout/checkout.validation";

import {
  useDelivery
} from "../features/delivery/DeliveryProvider";

import {
  createOrder,
  retryOzonCheckout,
  getSbpCapabilities,
  createSbpPayment,
  checkSbpPayment,
  checkOzonPayment,
  getDeliveryQuote,
  getDeliveryMethods,
  getPaymentMethods,
  getPricingQuote
} from "../shared/api/checkout";

import type {
  CreatedOrderApi,
  DeliveryQuoteApi,
  DeliveryMethodApi,
  PaymentMethodApi,
  PricingQuoteApi,
  OzonCheckoutPreviewApi
} from "../shared/api/checkout";

function formatPrice(
  value: number
): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatAddress(
  location: {
    region: string;
    city: string;
    street: string;
    house: string;
    apartment: string;
  }
): string {
  return [
    location.region,
    location.city,
    `${location.street}, д. ${location.house}`,
    location.apartment
      ? `кв. ${location.apartment}`
      : ""
  ]
    .filter(Boolean)
    .join(", ");
}

// Fail closed: real order creation stays unavailable until a separate reviewed release.

export default function CheckoutPage() {
  const isReturning = new URLSearchParams(window.location.search).get("ozonReturn") === "1";
  useEffect(() => { trackAnalyticsEvent("checkout_started", { path: window.location.pathname }); }, []);

  const { session, isInitializing } = useAuth();
  if (isInitializing) return <div className="checkout-page">Загрузка оформления заказа…</div>;
  if (isReturning) return <OzonPaymentReturn />;
  return <CheckoutForm key={session.user?.id ?? "guest"} />;
}

function OzonPaymentReturn() {
  const [status, setStatus] = useState<string>("Проверяем статус оплаты в Ozon…");
  const [busy, setBusy] = useState(false);
  const number = window.sessionStorage.getItem("teaMarketOzonOrderNumber");
  const refresh = async () => {
    if (!number) { setStatus("Номер заказа не найден. Проверьте заказ в профиле или обратитесь в магазин."); return; }
    setBusy(true);
    try {
      const response = await checkOzonPayment(number);
      setStatus(response.data.status === "paid" ? "Оплата подтверждена Ozon." :
        response.data.status === "test_paid" ? "Тестовая оплата. Реальный платёж не подтверждён." :
        `Текущий статус: ${response.data.status}. Подтверждение оплаты может занять время.`);
    } catch { setStatus("Не удалось проверить статус. Попробуйте ещё раз позднее."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, []);
  return <div className="checkout-page"><section className="checkout-result">
    <h1>Статус заказа Ozon</h1>
    {number && <p>Заказ № {number}</p>}
    <p role="status">{status}</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>Проверить статус</button>
    <Link to="/">Вернуться в магазин</Link>
  </section></div>;
}

function CheckoutForm() {
  const {
    session,
    isInitializing
  } = useAuth();

  const {
    items,
    totalAmount,
    isLoading: isCartLoading,
    error: cartError,
    refresh: refreshCart
  } = useCart();

  const {
    state: deliveryState
  } = useDelivery();

  const initialDraftRef = useRef(
    readCheckoutDraft(
      session.user?.id
    )
  );

  const isGuest = !session.isAuthenticated;
  const [guestContact, setGuestContact] = useState<CheckoutContact>(
    initialDraftRef.current?.contact ?? { name: "", phone: "", email: "" }
  );
  const [guestAddress, setGuestAddress] = useState<GuestCheckoutAddress>(
    initialDraftRef.current?.guestAddress ?? { city: "", street: "", house: "", apartment: "" }
  );
  const contact = isGuest ? guestContact : session.user;
  const [manualAddress, setManualAddress] = useState(false);
  const submittingRef = useRef(false);


  const [deliveryMethods, setDeliveryMethods] =
    useState<DeliveryMethodApi[]>([]);

  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethodApi[]>([]);

  const [optionsLoading, setOptionsLoading] =
    useState(true);

  const [optionsError, setOptionsError] =
    useState<string | null>(null);

  const [selectedLocationId, setSelectedLocationId] =
    useState(
      initialDraftRef.current?.selectedLocationId
      ?? ""
    );

  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] =
    useState(
      initialDraftRef.current?.selectedDeliveryMethodId
      ?? ""
    );

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState(
      initialDraftRef.current?.selectedPaymentMethodId
      ?? ""
    );

  const [orderComment, setOrderComment] =
    useState(
      initialDraftRef.current?.comment
      ?? ""
    );

  const [validationErrors, setValidationErrors] =
    useState<CheckoutValidationErrors>({});

  const [isReviewing, setIsReviewing] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [orderResult, setOrderResult] =
    useState<CreatedOrderApi | null>(null);
  const [ozonPreview, setOzonPreview] = useState<OzonCheckoutPreviewApi | null>(null);
  const [ozonCheckoutError, setOzonCheckoutError] = useState<string | null>(null);
  const [sbpEnabled, setSbpEnabled] = useState(false);
  const [sbpPayload, setSbpPayload] = useState<string | null>(null);
  const [sbpStatus, setSbpStatus] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getSbpCapabilities().then(r => { if (active) setSbpEnabled(r.canCreateLivePayment); })
      .catch(() => { if (active) setSbpEnabled(false); });
    return () => { active = false; };
  }, []);
  const [deliveryQuote, setDeliveryQuote] =
    useState<DeliveryQuoteApi | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pricingQuote, setPricingQuote] = useState<PricingQuoteApi | null>(null);

  const courierAddresses = useMemo(
    () =>
      deliveryState.locations.filter(
        (location) =>
          location.type === "courier"
      ),
    [deliveryState.locations]
  );

  const useManualAddress = isGuest || manualAddress || courierAddresses.length === 0;
  const selectedLocation = useManualAddress ? {
    ...guestAddress,
    id: "guest",
    type: "courier" as const,
    label: "Адрес доставки",
    region: "",
    postalCode: "",
    comment: "",
    isDefault: false,
    recipient: { name: contact?.name ?? "", phone: contact?.phone ?? "" }
  } : courierAddresses.find(
      (location) =>
        location.id === selectedLocationId
    ) ?? null;

  const selectedDeliveryMethod =
    deliveryMethods.find(
      (method) =>
        method.id === selectedDeliveryMethodId
    ) ?? null;

  const selectedPaymentMethod =
    paymentMethods.find(
      (method) =>
        method.id === selectedPaymentMethodId
    ) ?? null;

  const isSbpSelected = selectedPaymentMethod?.name === "СБП";
  const isPayOnDelivery = selectedPaymentMethod?.name === "При получении";
  const canPlaceOrder = (isSbpSelected && sbpEnabled) || isPayOnDelivery;

  const deliveryCost = deliveryQuote
    ? Number(deliveryQuote.cost)
    : 0;

  const effectiveItemsTotal = pricingQuote?.itemsTotal ?? totalAmount;
  const effectiveDeliveryCost = pricingQuote?.deliveryCost ?? deliveryCost;
  const discountTotal = pricingQuote?.discountTotal ?? 0;
  const total = pricingQuote?.totalAmount ?? (totalAmount + deliveryCost);

  const deliveryQuoteAddress = selectedLocation
    ? formatAddress(selectedLocation)
    : "";

  useEffect(() => {
    let cancelled = false;

    if (!selectedDeliveryMethodId || deliveryQuoteAddress.trim().length < 5) {
      setDeliveryQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    setDeliveryQuote(null);

    const timer = window.setTimeout(() => {
      void getDeliveryQuote(selectedDeliveryMethodId, deliveryQuoteAddress)
        .then((response) => {
          if (!cancelled) setDeliveryQuote(response.data);
        })
        .catch((error) => {
          if (!cancelled) {
            setQuoteError(error instanceof Error ? error.message : "Не удалось рассчитать доставку");
          }
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedDeliveryMethodId, deliveryQuoteAddress]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const [delivery, payment] =
          await Promise.all([
            getDeliveryMethods(),
            getPaymentMethods()
          ]);

        if (cancelled) {
          return;
        }

        setDeliveryMethods(
          delivery.data
        );

        setPaymentMethods(
          payment.data
        );

        setSelectedDeliveryMethodId(current => delivery.data.some(method => method.id === current) ? current : (delivery.data[0]?.id ?? ""));

        setSelectedPaymentMethodId(
          (current) =>
            payment.data.some(
              (method) =>
                method.id === current
            )
              ? current
              : payment.data[0]?.id
                ?? ""
        );
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить способы доставки и оплаты"
          );
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedLocationId(
      (current) => {
        if (
          courierAddresses.some(
            (location) =>
              location.id === current
          )
        ) {
          return current;
        }

        return (
          courierAddresses.find(
            (location) =>
              location.isDefault
          )?.id
          ?? courierAddresses[0]?.id
          ?? ""
        );
      }
    );
  }, [courierAddresses]);

  useEffect(() => {
    if (
      orderResult
    ) {
      return;
    }

    saveCheckoutDraft(
      session.user?.id,
      {
        selectedLocationId,
        selectedDeliveryMethodId,
        selectedPaymentMethodId,
        comment: orderComment,
        guestAddress,
        ...(isGuest ? { contact: guestContact } : {})
      }
    );
  }, [
    session.user?.id,
    selectedLocationId,
    selectedDeliveryMethodId,
    selectedPaymentMethodId,
    orderComment,
    orderResult,
    isGuest,
    guestContact,
    guestAddress
  ]);

  // После успешного POST /orders результат заказа имеет приоритет
  // над состоянием корзины: backend уже перевёл старую корзину в converted.
  useEffect(() => {
    if (!selectedDeliveryMethodId) { setPricingQuote(null); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getPricingQuote({deliveryMethodId:selectedDeliveryMethodId,promoCode:promoCode.trim()||undefined,referralCode:referralCode.trim()||undefined})
        .then(r=>{if(!cancelled)setPricingQuote(r.data)})
        .catch(()=>{if(!cancelled)setPricingQuote(null)});
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [selectedDeliveryMethodId, promoCode, referralCode, totalAmount]);

  if (orderResult) {
    return (
      <div className="checkout-page">
        <section className="checkout-result">
          <span className="checkout-result__icon">
            <PackageCheck
              size={42}
              strokeWidth={1.6}
              aria-hidden="true"
            />
          </span>

          <div className="checkout-result__content">
            <h1>Заказ оформлен</h1>

            <p>
              Сохраните номер заказа, чтобы обратиться в магазин.
            </p>
          </div>

          {isSbpSelected && (
            <section className="checkout-review__card" aria-label="Оплата через СБП">
              <h2>Оплата Ozon Pay через СБП</h2>
              {sbpPayload && /^https:\/\//i.test(sbpPayload) ? (
                <p><a href={sbpPayload} target="_blank" rel="noopener noreferrer">Открыть оплату через СБП</a></p>
              ) : <p>Ссылка на оплату пока недоступна.</p>}
              {sbpStatus && <p role="status">Статус: {sbpStatus}</p>}
              <button type="button" onClick={() => {
                void checkSbpPayment(orderResult.order_number).then(r => setSbpStatus(r.data.status))
                  .catch(e => setSbpStatus(e instanceof Error ? e.message : "Ошибка проверки оплаты"));
              }}>Проверить оплату</button>
              {!sbpPayload && <button type="button" onClick={() => {
                void createSbpPayment(orderResult.order_number).then(r => { setSbpPayload(r.data.sbpPayload); setSbpStatus(r.data.status); })
                  .catch(e => setSbpStatus(e instanceof Error ? e.message : "Не удалось получить ссылку"));
              }}>Получить ссылку на оплату</button>}
            </section>
          )}

          {ozonPreview && selectedPaymentMethod?.name === "Банковская карта онлайн" && (
            <section className="checkout-review__card" aria-label="Тестовый режим Ozon Pay">
              <h2>Ozon Pay — тестовая подготовка</h2>
              <p>Заказ сохранён. Реальная оплата и доставка через Ozon не запущены.</p>
              <p>Сумма для проверки: {formatPrice(ozonPreview.draft.payableKopecks / 100)}.</p>
              {!ozonPreview.matchesPersistedAmounts && (
                <p role="status">Сумма позиций не совпадает с итогом заказа. Перед подключением оплаты потребуется распределить скидки.</p>
              )}
              <p>Переход на платёжную страницу пока отключён.</p>
            </section>
          )}

          {ozonCheckoutError && <div role="alert" className="checkout-review__card">
            <p>Заказ сохранён, но платёжная ссылка пока недоступна: {ozonCheckoutError}.</p>
            <button type="button" onClick={() => {
              if (!orderResult) return;
              void retryOzonCheckout(orderResult.order_number).then(r => {
                window.sessionStorage.setItem("teaMarketOzonOrderNumber", orderResult.order_number);
                window.location.assign(r.data.checkoutUrl);
              })
                .catch(e => setOzonCheckoutError(e instanceof Error ? e.message : "Не удалось получить ссылку"));
            }}>Повторить переход к оплате</button>
          </div>}
          <dl className="checkout-result__details">
            <div>
              <dt>Номер заказа</dt>
              <dd>{orderResult.order_number}</dd>
            </div>

            <div>
              <dt>Сумма</dt>
              <dd>
                {formatPrice(
                  Number(orderResult.total_amount)
                )}
              </dd>
            </div>
          </dl>

          <div className="checkout-review__card">
            <h2>Состав заказа</h2>
            {(Array.isArray(orderResult.order_items)
              ? orderResult.order_items
              : orderResult.order_items
                ? [orderResult.order_items]
                : []
            ).map((item) => <p key={item.id}>
              {item.product_name}, {item.weight_g} г × {item.quantity} — {formatPrice(Number(item.line_total))}
            </p>)}
            <p>Статус заказа: {orderResult.status || "новый"}. Оплата: {orderResult.payment_status || "не оплачено"}.</p>
            {(Array.isArray(orderResult.order_deliveries)
              ? orderResult.order_deliveries
              : orderResult.order_deliveries
                ? [orderResult.order_deliveries]
                : []
            ).map((delivery) => <p key={delivery.id}>
              {delivery.delivery_methods?.name ?? "Доставка"}: {delivery.full_address}
            </p>)}
          </div>

          <div className="checkout-result__actions">
            <Link
              to="/"
              className="checkout-result__primary"
            >
              На главную
            </Link>

            {!isGuest && <Link
              to="/profile"
              className="checkout-result__secondary"
            >
              Перейти в профиль
            </Link>}
          </div>
        </section>
      </div>
    );
  }

  if (
    isInitializing
    || isCartLoading
    || (!isGuest && deliveryState.isLoading)
  ) {
    return (
      <div className="checkout-page">
        <section className="checkout-section">
          Загрузка оформления заказа…
        </section>
      </div>
    );
  }

  if (
    session.user
    && !session.user.profileCompleted
  ) {
    return (
      <Navigate
        to="/profile/details"
        replace
      />
    );
  }

  if (cartError) {
    return <div className="checkout-page"><p role="alert">{cartError}</p>
      <button type="button" onClick={() => void refreshCart()}>Повторить загрузку корзины</button>
      <Link to="/cart">Вернуться в корзину</Link></div>;
  }

  if (items.length === 0) {
    return (
      <Navigate
        to="/cart"
        replace
      />
    );
  }

  const clearValidationError = (
    field: CheckoutValidationField
  ) => {
    setValidationErrors(
      (current) => {
        const next = {
          ...current
        };

        delete next[field];
        return next;
      }
    );
  };

  const handleReview = () => {
    const errors = validateCheckout({
      user: contact,
      selectedLocation,
      selectedDeliveryMethodId,
      selectedPaymentMethodId
    });

    setValidationErrors(errors);

    if (hasCheckoutErrors(errors)) {
      const firstField = (
        Object.keys(errors)[0]
      ) as CheckoutValidationField;

      document
        .getElementById(
          `checkout-${firstField}`
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      return;
    }

    setSubmitError(null);
    setIsReviewing(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };



  const handleSubmit = async () => {
    if (!canPlaceOrder) {
      setSubmitError("Выбранный способ оплаты пока недоступен: подключение платёжного провайдера не подтверждено.");
      return;
    }

    if (
      submittingRef.current
      || !contact
      || !selectedLocation
      || !selectedDeliveryMethod
      || !selectedPaymentMethod
    ) {
      return;
    }

    const errors = validateCheckout({ user: contact, selectedLocation,
      selectedDeliveryMethodId, selectedPaymentMethodId });
    if (hasCheckoutErrors(errors)) {
      setValidationErrors(errors);
      setIsReviewing(false);
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response =
        await createOrder({
          customerName:
            contact.name,
          phone:
            contact.phone,
          email:
            contact.email.trim()
            || undefined,
          comment:
            orderComment.trim()
            || undefined,
          deliveryMethodId:
            selectedDeliveryMethod.id,
          delivery: {
            recipientName:
              selectedLocation.recipient.name,
            phone:
              selectedLocation.recipient.phone,
            fullAddress:
              formatAddress(selectedLocation),
            comment:
              selectedLocation.comment
              || undefined
          },
          paymentMethodId:
            selectedPaymentMethod.id,
          promoCode: promoCode.trim() || undefined,
          referralCode: referralCode.trim() || undefined
        });

      setOrderResult(response.data);
      if (isSbpSelected) {
        try {
          const sbp = await createSbpPayment(response.data.order_number);
          setSbpPayload(sbp.data.sbpPayload);
          setSbpStatus(sbp.data.status);
        } catch (e) {
          setSbpStatus(e instanceof Error ? e.message : "Не удалось создать платёж СБП");
        }
      }
      setOzonPreview(response.ozonCheckoutPreview ?? null);
      setOzonCheckoutError(response.ozonCheckoutError ?? null);
      if (response.ozonCheckout?.checkoutUrl) {
        window.sessionStorage.setItem("teaMarketOzonOrderNumber", response.data.order_number);
        window.location.assign(response.ozonCheckout.checkoutUrl);
        return;
      }

      clearCheckoutDraft(
        session.user?.id
      );

      // Обновляем глобальные индикаторы корзины, но не ждём повторной
      // загрузки уже закрытой (converted) корзины перед показом результата.
      notifyCartChanged();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Не удалось оформить заказ"
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isReviewing) {
    return (
      <div className="checkout-page">
        <header className="checkout-page__header">
          <button
            type="button"
            className="checkout-page__back"
            onClick={() =>
              setIsReviewing(false)
            }
          >
            <ChevronLeft
              size={20}
              aria-hidden="true"
            />

            Вернуться к оформлению
          </button>

          <h1>Проверка заказа</h1>
        </header>

        <section className="checkout-review">
          <div className="checkout-review__grid">
            <article className="checkout-review__card">
              <h3>Получатель</h3>
              <strong>{selectedLocation?.recipient.name}</strong>
              <span>{selectedLocation?.recipient.phone}</span>
            </article>

            <article className="checkout-review__card">
              <h3>Адрес</h3>
              <strong>{selectedLocation?.label}</strong>
              {selectedLocation && (
                <span>
                  {formatAddress(selectedLocation)}
                </span>
              )}
            </article>

            <article className="checkout-review__card">
              <h3>Доставка</h3>
              <strong>
                {selectedDeliveryMethod?.name}
              </strong>
              <span>
                {selectedDeliveryMethod?.deliveryTerm
                  || "Срок уточняется"}
              </span>
            </article>

            <article className="checkout-review__card">
              <h3>Оплата</h3>
              <strong>
                {selectedPaymentMethod?.name}
              </strong>
              <span>
                Ожидает оплаты.
              </span>
            </article>
          </div>

          <article className="checkout-review__card">
            <h3>Состав заказа</h3>

            <div className="checkout-review__items">
              {items.map(
                (item) => (
                  <div
                    key={item.id}
                    className="checkout-review__item"
                  >
                    <span>
                      {item.product.name}, {item.variant.weightG} г × {item.quantity}
                    </span>

                    <strong>
                      {formatPrice(
                        Number(item.lineTotal)
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>
          </article>

          <dl className="checkout-review__totals">
            <div>
              <dt>Товары</dt>
              <dd>{formatPrice(effectiveItemsTotal)}</dd>
            </div>

            <div>
              <dt>Доставка</dt>
              <dd>{formatPrice(effectiveDeliveryCost)}</dd>
            </div>

            {discountTotal > 0 && <div><dt>Скидка</dt><dd>−{formatPrice(discountTotal)}</dd></div>}

            <div className="checkout-review__total">
              <dt>Итого</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>

          {!canPlaceOrder && (
            <p role="status" className="checkout-field-error">
              {isSbpSelected
                ? "Оплата через Ozon Pay СБП пока не активирована. Заказ и списание средств не выполняются."
                : "Онлайн-оплата банковской картой пока не подключена. Выберите «При получении» или дождитесь подключения СБП."}
            </p>
          )}

          {submitError && (
            <p className="checkout-field-error">
              {submitError}
            </p>
          )}

          <button
            type="button"
            className="checkout-review__place-order"
            disabled={isSubmitting || !canPlaceOrder}
            onClick={() => { void handleSubmit(); }}
          >
            {isSubmitting
              ? "Создаём заказ…"
              : canPlaceOrder
                ? (isSbpSelected ? "Оформить заказ и оплатить через СБП" : "Оформить заказ")
                : (isSbpSelected ? "СБП пока недоступна" : "Оплата пока недоступна")}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-page__header">
        <Link
          to="/cart"
          className="checkout-page__back"
        >
          <ChevronLeft
            size={20}
            aria-hidden="true"
          />

          Вернуться в корзину
        </Link>

        <h1>Оформление заказа</h1>
      </header>

      {optionsError && (
        <p className="checkout-field-error">
          {optionsError}
        </p>
      )}

      <div className="checkout-page__layout">
        <div className="checkout-page__main">
          <section
            id="checkout-recipient"
            className={
              validationErrors.recipient
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              <span className="checkout-section__step">1</span>
              <span className="checkout-section__icon">
                <UserRound size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>Контактные данные</h2>
                <p>{isGuest ? "Покупка без регистрации" : "Получены из профиля"}</p>
              </div>
            </div>

            {isGuest ? (
              <div className="checkout-form-fields">
                {([
                  ["name", "Имя получателя", "text", "name", 255],
                  ["phone", "Телефон", "tel", "tel", 32],
                  ["email", "Электронная почта (необязательно)", "email", "email", 320]
                ] as const).map(([field, label, type, autoComplete, maxLength]) => (
                  <label key={field}>
                    <span>{label}</span>
                    <input type={type} autoComplete={autoComplete} maxLength={maxLength}
                      required={field !== "email"} value={guestContact[field]}
                      onChange={(event) => {
                        setGuestContact((current) => ({ ...current, [field]: event.target.value }));
                        clearValidationError("recipient");
                      }} />
                  </label>
                ))}
              </div>
            ) : (
            <div className="checkout-recipient">
              <strong>{contact?.name}</strong>
              <span>{contact?.phone}</span>
              {contact?.email && (
                <span>{contact.email}</span>
              )}
              <Link to="/profile/details">
                Изменить личные данные
              </Link>
            </div>
            )}

            {validationErrors.recipient && (
              <p className="checkout-field-error">
                {validationErrors.recipient}
              </p>
            )}
          </section>

          <section
            id="checkout-location"
            className={
              validationErrors.location
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              <span className="checkout-section__step">2</span>
              <span className="checkout-section__icon">
                <MapPin size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>Адрес доставки</h2>
                <p>{useManualAddress ? "Укажите адрес получения заказа" : "Сохранённые адреса"}</p>
              </div>
            </div>

            {useManualAddress ? (
              <div className="checkout-form-fields">
                {([
                  ["city", "Город"], ["street", "Улица"],
                  ["house", "Дом / корпус"], ["apartment", "Квартира (необязательно)"]
                ] as const).map(([field, label]) => (
                  <label key={field}>
                    <span>{label}</span>
                    <input value={guestAddress[field]} maxLength={255}
                      required={field !== "apartment"}
                      onChange={(event) => {
                        setGuestAddress((current) => ({ ...current, [field]: event.target.value }));
                        clearValidationError("location");
                      }} />
                  </label>
                ))}
              </div>
            ) : courierAddresses.length > 0 ? (
              <div className="checkout-locations">
                {courierAddresses.map(
                  (location) => {
                    const selected =
                      location.id === selectedLocationId;

                    return (
                      <button
                        key={location.id}
                        type="button"
                        className={
                          selected
                            ? "checkout-location checkout-location--selected"
                            : "checkout-location"
                        }
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          clearValidationError("location");
                        }}
                      >
                        <span className="checkout-location__marker">
                          {selected ? (
                            <Check size={17} aria-hidden="true" />
                          ) : (
                            <MapPin size={17} aria-hidden="true" />
                          )}
                        </span>

                        <span className="checkout-location__content">
                          <strong>{location.label}</strong>
                          <span>{formatAddress(location)}</span>
                          <small>
                            {location.recipient.name}, {location.recipient.phone}
                          </small>
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : null}
            {!isGuest && courierAddresses.length > 0 && (
              <button type="button" onClick={() => {
                setManualAddress((current) => !current);
                clearValidationError("location");
              }}>{manualAddress ? "Выбрать сохранённый адрес" : "Указать другой адрес"}</button>
            )}

            {validationErrors.location && (
              <p className="checkout-field-error">
                {validationErrors.location}
              </p>
            )}
          </section>

          <section
            id="checkout-delivery"
            className={
              validationErrors.delivery
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              <span className="checkout-section__step">3</span>
              <span className="checkout-section__icon">
                <Truck size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>Доставка Ozon</h2>
                <p>Выбор способа и адреса доставки — внутри Ozon Pay Checkout</p>
              </div>
            </div>

            <div className="checkout-delivery-options">
              <p><strong>Доставка оформляется в Ozon Pay Checkout.</strong></p>
              <p>После подключения Ozon Pay покупатель выберет доступный пункт выдачи или курьерскую доставку непосредственно на стороне Ozon. Адреса, доступность и тарифы определяются Ozon.</p>
              <p role="status">Сейчас работает только подготовительный режим. Переход в Ozon Pay, оплата и создание отправления отключены.</p>
            </div>

            {validationErrors.delivery && (
              <p className="checkout-field-error">
                {validationErrors.delivery}
              </p>
            )}
          </section>

          <section
            id="checkout-payment"
            className={
              validationErrors.payment
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              <span className="checkout-section__step">4</span>
              <span className="checkout-section__icon">
                <CreditCard size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>Оплата через Ozon Pay</h2>
                <p>Оплата на защищённой странице Ozon</p>
              </div>
            </div>

            <div className="checkout-payment-methods">
              {paymentMethods
                .filter((method) => method.name === "СБП")
                .map((method) => (
                  <label key={method.id} className="checkout-payment-method">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethodId === method.id}
                      onChange={() => setSelectedPaymentMethodId(method.id)}
                    />
                    <span>СБП — оплата через Ozon Pay</span>
                  </label>
                ))}
            </div>
            <p>Оплата производится через Ozon Pay. Банковские реквизиты в магазине не вводятся.</p>
            {!sbpEnabled && (
              <p role="status">Оплата через СБП пока не активирована.</p>
            )}

            {validationErrors.payment && (
              <p className="checkout-field-error">
                {validationErrors.payment}
              </p>
            )}
          </section>

          <section className="checkout-section">
            <div className="checkout-section__heading"><div><h2>Скидки</h2><p>Необязательно</p></div></div>
            <div className="checkout-loyalty">
              <label className="checkout-loyalty__block"><span>Промокод</span><input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} placeholder="TEA10" /></label>
              <label className="checkout-loyalty__block"><span>Реферальный код</span><input value={referralCode} onChange={e=>setReferralCode(e.target.value.toUpperCase())} placeholder="Код друга" /></label>
            </div>
            {pricingQuote?.discounts.length ? <p className="checkout-loyalty__message">{pricingQuote.discounts.map(x=>`${x.name}: −${formatPrice(x.amount)}`).join(" · ")}</p> : null}
          </section>

          <section className="checkout-section">
            <div className="checkout-section__heading">
              <span className="checkout-section__step">5</span>
              <span className="checkout-section__icon">
                <MessageSquareText size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>Комментарий</h2>
                <p>Необязательно</p>
              </div>
            </div>

            <textarea
              value={orderComment}
              maxLength={2000}
              placeholder="Комментарий к заказу"
              onChange={(event) =>
                setOrderComment(event.target.value)
              }
            />
          </section>
        </div>

        <aside className="checkout-summary">
          <h2>Ваш заказ</h2>

          <div className="checkout-summary__items">
            {items.map(
              (item) => (
                <div key={item.id}>
                  <span>
                    {item.product.name}, {item.variant.weightG} г × {item.quantity}
                  </span>
                  <strong>
                    {formatPrice(Number(item.lineTotal))}
                  </strong>
                </div>
              )
            )}
          </div>

          <dl className="checkout-summary__totals">
            <div>
              <dt>Товары</dt>
              <dd>{formatPrice(effectiveItemsTotal)}</dd>
            </div>

            <div>
              <dt>Доставка</dt>
              <dd>
                {!selectedDeliveryMethod
                  ? "Не выбрана"
                  : quoteLoading
                    ? "Рассчитывается…"
                    : quoteError
                      ? "Ошибка расчёта"
                      : deliveryQuote
                        ? formatPrice(effectiveDeliveryCost)
                        : "Укажите адрес"}
              </dd>
            </div>

            {discountTotal > 0 && <div><dt>Скидка</dt><dd>−{formatPrice(discountTotal)}</dd></div>}

            <div className="checkout-summary__total">
              <dt>Итого</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>

          <p role="status">Стоимость доставки рассчитывается выбранным способом доставки и уточняется при оформлении.</p>

          <button
            type="button"
            className="checkout-summary__submit"
            disabled={
              optionsLoading
              || Boolean(optionsError)
              || quoteLoading
              || Boolean(quoteError)
              || !deliveryQuote
            }
            onClick={handleReview}
          >
            Проверить заказ
          </button>
        </aside>
      </div>
    </div>
  );
}
