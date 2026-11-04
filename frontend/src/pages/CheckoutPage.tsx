import YandexPickupMap, { type PickupPoint } from "../shared/widgets/YandexPickupMap";
import { apiRequest } from "../shared/api/client";
import { getSavedOrderAccess, saveOrderAccess } from "../features/checkout/order-access.storage";
import { trackAnalyticsEvent } from "../features/analytics/analytics";
import {
  Check,
  X,
  ChevronLeft,
  Clock3,
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
  getDeliveryQuote,
  getDeliveryMethods,
  getPricingQuote,
  getYandexPickupQuote,
  getYandexDoorQuote
} from "../shared/api/checkout";

import type {
  CreatedOrderApi,
  DeliveryQuoteApi,
  DeliveryMethodApi,
  PricingQuoteApi
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

export default function CheckoutPage() {
  useEffect(() => { trackAnalyticsEvent("checkout_started", { path: window.location.pathname }); }, []);

  const { session, isInitializing } = useAuth();
  if (isInitializing) return <div className="checkout-page">Загрузка оформления заказа…</div>;
  return <CheckoutForm key={session.user?.id ?? "guest"} />;
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

  const [testPickupPoints, setTestPickupPoints] = useState<PickupPoint[]>([]);
  const [testPickupError, setTestPickupError] = useState("");
  const [testPickupLoading, setTestPickupLoading] = useState(false);
  const [testPickupSelected, setTestPickupSelected] = useState("");
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState<PickupPoint | null>(null);
  const [yandexMode, setYandexMode] = useState<"pickup"|"door">("pickup");
  const [yandexQuote, setYandexQuote] = useState<{price:number;deliveryDays:number|null}|null>(null);
  const [yandexError, setYandexError] = useState<string|null>(null);
  const [yandexLoading, setYandexLoading] = useState(false);
  const openPickupModal = () => {
    setPickupModalOpen(true);
    if (!testPickupPoints.length && !testPickupLoading) void loadTestPickupPoints();
  };
  useEffect(() => {
    if (!pickupModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickupModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickupModalOpen]);
  const loadTestPickupPoints = async () => {
    setTestPickupLoading(true); setTestPickupError("");
    try {
      const response = await apiRequest<{data:{points:PickupPoint[]}}>("/yandex-test/points");
      // Sandbox reference destination: verified with Yandex pricing-calculator.
      // Do not use this fallback in production or substitute it for the customer's selection.
      const referencePoint: PickupPoint = {
        id: "01946f4f013c7337874ec2fb848a58a4",
        name: "Контрольный ПВЗ Яндекса (тестовый)",
        address: "г. Москва, Ленинградский проспект, 37к9",
        city: "Москва",
      };
      const points = response.data.points;
      setTestPickupPoints(
        points.some(point => point.id === referencePoint.id)
          ? points
          : [referencePoint, ...points]
      );
    } catch (error) { setTestPickupError(error instanceof Error ? error.message : "Ошибка загрузки ПВЗ"); }
    finally { setTestPickupLoading(false); }
  };
  const [deliveryMethods, setDeliveryMethods] =
    useState<DeliveryMethodApi[]>([]);
  const visibleDeliveryMethods = deliveryMethods.filter(
    method => /яндекс|yandex/i.test(method.name)
      && !/курьер|до двери|door|courier/i.test(method.name)
  );

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

  const selectedPaymentMethodId = "";

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

  const pickupMode = yandexMode === "pickup" && Boolean(deliveryMethods.find(m=>m.id===selectedDeliveryMethodId && /яндекс|yandex/i.test(m.name)));
  const useManualAddress = isGuest || manualAddress || courierAddresses.length === 0 || yandexMode === "door";
  const selectedLocation = pickupMode && pickupConfirmed ? {
    id: "yandex-pickup", type:"courier" as const, label:pickupConfirmed.name,
    region:"", city:"Москва", street:pickupConfirmed.address, house:"ПВЗ", apartment:"",
    postalCode:"", comment:"", isDefault:false,
    recipient:{name:contact?.name??"",phone:contact?.phone??""}
  } : useManualAddress ? {
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

  const isYandex = Boolean(selectedDeliveryMethod && /яндекс|yandex/i.test(selectedDeliveryMethod.name));
  const deliveryDestination = isYandex && yandexMode === "pickup" ? pickupConfirmed?.id ?? null : null;
  const doorAddress = [guestAddress.city,guestAddress.street,guestAddress.house].map(v => v.trim()).filter(Boolean).join(", ").trim();
  const doorAddressComplete = Boolean(guestAddress.city.trim() && guestAddress.street.trim() && guestAddress.house.trim());
  const yandexReady = !isYandex || ((yandexMode === "door" ? doorAddressComplete : Boolean(deliveryDestination)) && Boolean(yandexQuote) && !yandexError && !yandexLoading);
  const deliveryCost = deliveryQuote
    ? Number(deliveryQuote.cost)
    : 0;

  const effectiveItemsTotal = pricingQuote?.itemsTotal ?? totalAmount;
  const effectiveDeliveryCost = pricingQuote?.deliveryCost ?? (isYandex ? (yandexQuote?.price ?? 0) : deliveryCost);
  const discountTotal = pricingQuote?.discountTotal ?? 0;
  const total = pricingQuote?.totalAmount ?? (totalAmount + effectiveDeliveryCost);

  const deliveryQuoteAddress = selectedLocation
    ? formatAddress(selectedLocation)
    : "";

  useEffect(() => {
    let cancelled = false;

    if (!selectedDeliveryMethodId || isYandex || deliveryQuoteAddress.trim().length < 5) {
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
  }, [selectedDeliveryMethodId, deliveryQuoteAddress, isYandex]);

  useEffect(() => {
    let cancelled=false;
    setYandexQuote(null);setYandexError(null);
    if (!isYandex || (yandexMode === "pickup" ? !deliveryDestination : !doorAddressComplete)) {setYandexLoading(false);return;}
    setYandexLoading(true);
    const timer = window.setTimeout(() => {
      void (yandexMode === "door" ? getYandexDoorQuote(doorAddress) : getYandexPickupQuote(deliveryDestination!))
        .then(r=>{if(!cancelled)setYandexQuote(r.data)})
        .catch(e=>{if(!cancelled)setYandexError(e instanceof Error?e.message:(yandexMode === "door" ? "Курьерская доставка недоступна" : "Доставка в этот ПВЗ недоступна"))})
        .finally(()=>{if(!cancelled)setYandexLoading(false)});
    }, yandexMode === "door" ? 700 : 100);
    return ()=>{cancelled=true;window.clearTimeout(timer)};
  },[isYandex,deliveryDestination,yandexMode,doorAddress,doorAddressComplete,totalAmount]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const delivery = await getDeliveryMethods();

        if (cancelled) {
          return;
        }

        setDeliveryMethods(
          delivery.data
        );

        setSelectedDeliveryMethodId((current) => {
          const pickupMethods = delivery.data.filter(method =>
            /яндекс|yandex/i.test(method.name) &&
            !/курьер|до двери|door|courier/i.test(method.name)
          );
          return pickupMethods.some(method => method.id === current)
            ? current : pickupMethods[0]?.id ?? "";
        });

      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить способы доставки"
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
    if (!selectedDeliveryMethodId || (isYandex && !yandexQuote)) { setPricingQuote(null); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getPricingQuote({deliveryMethodId:selectedDeliveryMethodId,destinationStationId:isYandex && yandexMode === "pickup" ? deliveryDestination??undefined:undefined,deliveryMode:isYandex?yandexMode:undefined,destinationAddress:isYandex && yandexMode === "door"?doorAddress:undefined,promoCode:promoCode.trim()||undefined,referralCode:referralCode.trim()||undefined})
        .then(r=>{if(!cancelled)setPricingQuote(r.data)})
        .catch(()=>{if(!cancelled)setPricingQuote(null)});
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [selectedDeliveryMethodId, promoCode, referralCode, totalAmount, isYandex, deliveryDestination, yandexMode, doorAddress, yandexQuote?.price]);

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
            <h1>Заказ создан</h1>

            <p>
              Сохраните номер заказа. Онлайн-оплата станет доступна после подключения ЮKassa.
            </p>
          </div>

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

    if(isYandex && yandexMode === "pickup" && pickupConfirmed) delete errors.location;
    if(isYandex && yandexMode === "door" && (!guestAddress.city.trim() || !guestAddress.street.trim() || !guestAddress.house.trim())) errors.location="Укажите город, улицу и дом";
    if(isYandex && (!yandexReady || !pricingQuote)) errors.delivery="Дождитесь подтверждения тарифа и итоговой суммы";
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
    if (
      submittingRef.current
      || !contact
      || !selectedLocation
      || !selectedDeliveryMethod
    ) {
      return;
    }

    const errors = validateCheckout({ user: contact, selectedLocation,
      selectedDeliveryMethodId, selectedPaymentMethodId });
    if(isYandex && yandexMode === "pickup" && pickupConfirmed) delete errors.location;
    if(isYandex && yandexMode === "door" && (!guestAddress.city.trim() || !guestAddress.street.trim() || !guestAddress.house.trim())) errors.location="Укажите город, улицу и дом";
    if(isYandex && (!yandexReady || !pricingQuote)) errors.delivery="Нет подтверждённой стоимости доставки";
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
          destinationStationId: isYandex && yandexMode === "pickup" ? pickupConfirmed?.id : undefined,
          deliveryMode: isYandex ? yandexMode : undefined,
          delivery: {
            recipientName:
              selectedLocation.recipient.name,
            phone:
              selectedLocation.recipient.phone,
            fullAddress:
              isYandex && yandexMode === "pickup" && pickupConfirmed ? pickupConfirmed.address : isYandex && yandexMode === "door" ? doorAddress : formatAddress(selectedLocation),
            comment:
              selectedLocation.comment
              || undefined
          },
          promoCode: promoCode.trim() || undefined,
          referralCode: referralCode.trim() || undefined
        });

      setOrderResult(response.data);
      // A guest must retain access to the created order before leaving this site.
      // An outdated backend may create an order without returning accessToken.
      const accessToken = response.accessToken;
      if (!accessToken || !/^[0-9a-f]{64}$/i.test(accessToken)) {
        setSubmitError("Заказ создан, но сервер не вернул ключ доступа к нему. Не оформляйте повторный заказ: проверьте версию backend.");
        return;
      }
      try {
        saveOrderAccess({
          id: response.data.id,
          orderNumber: response.data.order_number,
          accessToken
        });
        if (getSavedOrderAccess(response.data.id) !== accessToken) {
          throw new Error("ORDER_ACCESS_STORAGE_FAILED");
        }
      } catch {
        setSubmitError("Заказ создан, но браузер не смог сохранить доступ к нему. Проверьте настройки хранения данных сайта. Не оформляйте повторный заказ.");
        return;
      }
      // The order page works without sign-in in the same browser.
      if (response.payment?.confirmationUrl) {
        window.location.assign(response.payment.confirmationUrl);
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
                ЮKassa — онлайн-оплата
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

          {submitError && (
            <p className="checkout-field-error">
              {submitError}
            </p>
          )}

          <button
            type="button"
            className="checkout-review__place-order"
            disabled={isSubmitting}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting
              ? "Создаём заказ…"
              : "Оформить заказ"}
          </button>
          <p className="checkout-legal-note">Нажимая «Оформить заказ», вы принимаете условия <Link to="/legal/offer" target="_blank" rel="noopener noreferrer">Публичной оферты</Link>.</p>
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

          {!isYandex && (
          <div
            id="checkout-location"
            className={
              validationErrors.location
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              
              <span className="checkout-section__icon">
                <MapPin size={21} aria-hidden="true" />
              </span>
              <div>
                <h3>Адрес доставки</h3>
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
          </div>
          )}

          <section
            id="checkout-delivery"
            className={
              validationErrors.delivery
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              <span className="checkout-section__step">2</span>
              <span className="checkout-section__icon">
                <Truck size={21} aria-hidden="true" />
              </span>
              <div>
                <h2>Способ доставки</h2>
                <p>Выберите подходящий вариант</p>
              </div>
            </div>

            {optionsLoading ? (
              <p>Загружаем способы доставки…</p>
            ) : (
              <div className="checkout-delivery-options">
                {visibleDeliveryMethods.map(
                  (method) => {
                    const enabled = true;
                    const selected =
                      method.id === selectedDeliveryMethodId;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        disabled={!enabled}
                        className={
                          selected
                            ? "checkout-delivery-option checkout-delivery-option--selected"
                            : "checkout-delivery-option"
                        }
                        onClick={() => {
                          if (!enabled) return;
                          setSelectedDeliveryMethodId(method.id);
                          clearValidationError("delivery");
                        }}
                      >
                        <span className="checkout-delivery-option__marker">
                          {selected && (
                            <Check size={17} aria-hidden="true" />
                          )}
                        </span>

                        <span className="checkout-delivery-option__content">
                          <strong>{method.name}</strong>
                          <small>
                            {enabled
                              ? method.deliveryTerm || "Срок уточняется"
                              : "Будет доступно после подключения API службы доставки"}
                          </small>
                        </span>

                        <span className="checkout-delivery-option__details">
                          <strong>
                            {/яндекс|yandex/i.test(method.name) ? (isYandex && yandexQuote ? formatPrice(yandexQuote.price) : "По тарифу Яндекса") : formatPrice(Number(method.baseCost))}
                          </strong>
                          {method.deliveryTerm && (
                            <span>
                              <Clock3 size={15} aria-hidden="true" />
                              {method.deliveryTerm}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {isYandex && <div className="checkout-delivery-options" style={{marginTop:12,marginBottom:16}}>
              <button type="button" className={"checkout-delivery-option"+(yandexMode === "pickup" ? " checkout-delivery-option--selected" : "")} onClick={()=>{setYandexMode("pickup");setPricingQuote(null)}}>В пункт выдачи</button>
              <button type="button" className={"checkout-delivery-option"+(yandexMode === "door" ? " checkout-delivery-option--selected" : "")} onClick={()=>{setYandexMode("door");setPricingQuote(null)}}>Курьером до двери</button>
            </div>}
            {isYandex && yandexMode === "door" && (
          <div
            id="checkout-location"
            className={
              validationErrors.location
                ? "checkout-section checkout-section--error"
                : "checkout-section"
            }
          >
            <div className="checkout-section__heading">
              
              <span className="checkout-section__icon">
                <MapPin size={21} aria-hidden="true" />
              </span>
              <div>
                <h3>Адрес доставки</h3>
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
          </div>
            )}
            {isYandex && yandexMode === "pickup" && <div className="checkout-pickup-method">
              <div className="checkout-pickup-method__head">
                <MapPin size={21} aria-hidden="true" />
                <div>
                  <strong>Яндекс Доставка — пункт выдачи</strong>
                  <small>Выберите удобный пункт на карте</small>
                </div>
              </div>
              {pickupConfirmed ? (
                <div className="checkout-pickup-method__address">
                  <strong>{pickupConfirmed.name}</strong>
                  <span>{pickupConfirmed.address}</span>
                </div>
              ) : null}
              <button type="button" className="checkout-pickup-method__button" onClick={openPickupModal}>
                <MapPin size={17} aria-hidden="true" />
                {pickupConfirmed ? "Изменить пункт выдачи" : "Выбрать пункт выдачи"}
              </button>
              {isYandex && yandexLoading && <small>Рассчитываем тариф Яндекса…</small>}
              {isYandex && yandexError && <p role="alert" style={{color:"#b43c34"}}>{yandexError}. Выберите другой ПВЗ: пока Яндекс не подтвердит тариф, продолжить оформление нельзя.</p>}
              {isYandex && yandexQuote && <strong>Доставка: {formatPrice(yandexQuote.price)} · {yandexQuote.deliveryDays ?? "?"} дн.</strong>}
              <small className="checkout-pickup-method__note">Тестовый контур Яндекса. Стоимость подтверждается повторно при создании заказа.</small>
            </div>}
            {isYandex && yandexMode === "pickup" && yandexLoading && <small>Рассчитываем тариф Яндекса…</small>}
            {isYandex && yandexMode === "door" && yandexLoading && <small>Рассчитываем доставку до двери…</small>}
            {isYandex && yandexMode === "door" && yandexError && <p role="alert" className="checkout-field-error">{yandexError}</p>}
            {isYandex && yandexMode === "door" && yandexQuote && <strong>Доставка до двери: {formatPrice(yandexQuote.price)}</strong>}
            {validationErrors.delivery && (
              <p className="checkout-field-error">
                {validationErrors.delivery}
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
                      : isYandex && yandexLoading
                        ? "Рассчитывается…"
                        : isYandex && yandexError
                          ? "ПВЗ недоступен"
                          : (isYandex ? yandexQuote : deliveryQuote)
                            ? formatPrice(effectiveDeliveryCost)
                            : isYandex ? "Выберите доступный ПВЗ" : "Укажите адрес"}
              </dd>
            </div>

            {discountTotal > 0 && <div><dt>Скидка</dt><dd>−{formatPrice(discountTotal)}</dd></div>}

            <div className="checkout-summary__total">
              <dt>Итого</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>

          <button
            type="button"
            className="checkout-summary__submit"
            disabled={
              optionsLoading
              || Boolean(optionsError)
              || quoteLoading
              || Boolean(quoteError)
              || (isYandex ? !yandexReady || !pricingQuote : !deliveryQuote)
            }
            onClick={handleReview}
          >
            Проверить заказ
          </button>
          {isYandex && !yandexReady && <p role="status" style={{marginTop:12,fontSize:13}}>{yandexLoading ? "Ожидаем расчёт Яндекса…" : yandexError ? "Яндекс не подтвердил доставку в выбранный ПВЗ. Выберите другой пункт получения на карте." : "Для продолжения выберите ПВЗ с доступным тарифом Яндекса."}</p>}
          {isYandex && yandexError && <button type="button" onClick={openPickupModal} className="checkout-pickup-method__button" style={{marginTop:12}}>Выбрать другой ПВЗ</button>}
        </aside>
      </div>
      {pickupModalOpen && (
        <div className="checkout-pickup-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPickupModalOpen(false);
        }}>
          <section className="checkout-pickup-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-pickup-title">
            <header className="checkout-pickup-dialog__header">
              <div>
                <h2 id="checkout-pickup-title">Выбор пункта выдачи</h2>
                <p>Пункты Яндекс Доставки на карте</p>
              </div>
              <button type="button" aria-label="Закрыть карту" className="checkout-pickup-dialog__close" onClick={() => setPickupModalOpen(false)}><X size={22}/></button>
            </header>
            <div className="checkout-pickup-dialog__body">
              {testPickupLoading && <p>Загружаем пункты выдачи…</p>}
              {testPickupError && <p role="alert">{testPickupError} <button type="button" onClick={() => void loadTestPickupPoints()}>Повторить</button></p>}
              <div style={{border:"1px solid #9ba99c",borderRadius:12,padding:14,marginBottom:14,background:"#f1f4ee"}}>
                <strong>Контрольный пункт Яндекса — тестовый маршрут</strong>
                <p style={{margin:"6px 0 12px"}}>Москва, Ленинградский проспект, 37к9. Для этого ПВЗ тестовый калькулятор ранее подтвердил доставку. Цена рассчитывается заново для текущей корзины.</p>
                <button type="button" className="checkout-pickup-method__button" onClick={() => {
                  const point: PickupPoint = {id:"01946f4f013c7337874ec2fb848a58a4",name:"Контрольный ПВЗ Яндекса (тестовый)",address:"г. Москва, Ленинградский проспект, 37к9",city:"Москва"};
                  setTestPickupSelected(point.id);
                  setPickupConfirmed(point);
                  const yandex = deliveryMethods.find(m => /яндекс|yandex/i.test(m.name) && !/курьер|до двери|door|courier/i.test(m.name));
                  if (yandex) setSelectedDeliveryMethodId(yandex.id);
                  setPickupModalOpen(false);
                }}>Выбрать контрольный ПВЗ</button>
              </div>
              {testPickupPoints.length > 0 && (
                <YandexPickupMap points={testPickupPoints} selectedId={testPickupSelected} onSelect={p => setTestPickupSelected(p.id)} title="Поиск по адресу или названию" />
              )}
            </div>
            <footer className="checkout-pickup-dialog__footer">
              <span>{testPickupSelected ? testPickupPoints.find(p => p.id === testPickupSelected)?.address : "Выберите пункт на карте"}</span>
              <button type="button" disabled={!testPickupSelected} onClick={() => {
                const point = testPickupPoints.find(p => p.id === testPickupSelected);
                if (point) {
                  setPickupConfirmed(point);
                  const yandex = deliveryMethods.find(m=>/яндекс|yandex/i.test(m.name));
                  if (yandex) setSelectedDeliveryMethodId(yandex.id);
                }
                setPickupModalOpen(false);
              }}>Подтвердить пункт</button>
            </footer>
            <p className="checkout-pickup-dialog__disclaimer">Тестовый контур Яндекса. Недоступные маршруты не допускаются к оформлению.</p>
          </section>
        </div>
      )}
    </div>
  );
}
