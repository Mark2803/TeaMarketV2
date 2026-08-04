import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  Truck
} from "lucide-react";

import {
  useEffect,
  useState
} from "react";

import {
  Link,
  Navigate,
  useParams
} from "react-router-dom";

import {
  useAuth
} from "../features/auth/AuthProvider";

import {
  getCustomerOrder
} from "../shared/api/orders";

import type {
  CustomerOrderDetailsApi
} from "../shared/api/orders";

import "../shared/styles/orders.css";

const ORDER_STATUS_LABELS:
Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "Собирается",
  shipped: "Передан в доставку",
  delivered: "Доставлен",
  completed: "Завершён",
  cancelled: "Отменён"
};

const PAYMENT_STATUS_LABELS:
Record<string, string> = {
  unpaid: "Не оплачен",
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  partially_refunded:
    "Частичный возврат",
  refunded: "Возвращён",
  failed: "Ошибка оплаты"
};

const DELIVERY_STATUS_LABELS:
Record<string, string> = {
  pending: "Ожидает обработки",
  preparing: "Готовится к отправке",
  shipped: "Передана в доставку",
  delivered: "Доставлена",
  cancelled: "Отменена"
};

function formatPrice(
  value: string
): string {
  return `${Number(value).toLocaleString("ru-RU")} ₽`;
}

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(new Date(value));
}

export default function OrderDetailsPage() {
  const {
    orderNumber = ""
  } = useParams<{
    orderNumber: string;
  }>();

  const {
    session,
    isInitializing
  } = useAuth();

  const [order, setOrder] =
    useState<CustomerOrderDetailsApi | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (
      !session.isAuthenticated
      || !orderNumber
    ) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrder() {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await getCustomerOrder(
            orderNumber
          );

        if (!cancelled) {
          setOrder(response.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить заказ"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [
    session.isAuthenticated,
    orderNumber
  ]);

  if (isInitializing) {
    return (
      <div className="orders-page">
        <section className="orders-state">
          Загружаем профиль…
        </section>
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <Navigate
        to="/auth"
        replace
      />
    );
  }

  if (isLoading) {
    return (
      <div className="orders-page">
        <section className="orders-state">
          Загружаем заказ…
        </section>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="orders-page">
        <section className="orders-state orders-state--error">
          <h1>
            Заказ не найден
          </h1>

          <p>
            {error
              ?? "Заказ недоступен."}
          </p>

          <Link
            to="/profile/orders"
            className="orders-state__action"
          >
            К списку заказов
          </Link>
        </section>
      </div>
    );
  }

  const delivery =
    order.order_deliveries[0]
    ?? null;

  const payment =
    order.order_payments.at(-1)
    ?? null;

  return (
    <div className="orders-page">
      <Link
        to="/profile/orders"
        className="order-details__back"
      >
        <ArrowLeft
          size={19}
          aria-hidden="true"
        />

        Все заказы
      </Link>

      <header className="order-details__header">
        <div>
          <span>
            Заказ
          </span>

          <h1>
            {order.order_number}
          </h1>

          <p>
            Оформлен:
            {" "}
            {formatDate(
              order.ordered_at
            )}
          </p>
        </div>

        <span className="order-status">
          {
            ORDER_STATUS_LABELS[
              order.status
            ]
            ?? order.status
          }
        </span>
      </header>

      <div className="order-details__grid">
        <section className="order-details__section">
          <div className="order-details__section-heading">
            <Package
              size={21}
              aria-hidden="true"
            />

            <h2>
              Состав заказа
            </h2>
          </div>

          <div className="order-items">
            {order.order_items.map(
              (item) => (
                <article
                  key={item.id}
                  className="order-item"
                >
                  <div>
                    <strong>
                      {item.product_name}
                    </strong>

                    <span>
                      SKU: {item.sku}
                    </span>

                    {item.weight_g !== null && (
                      <span>
                        Вес:
                        {" "}
                        {item.weight_g} г
                      </span>
                    )}
                  </div>

                  <div className="order-item__price">
                    <span>
                      {item.quantity}
                      {" × "}
                      {formatPrice(
                        item.unit_price
                      )}
                    </span>

                    <strong>
                      {formatPrice(
                        item.line_total
                      )}
                    </strong>
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        <section className="order-details__section">
          <div className="order-details__section-heading">
            <Truck
              size={21}
              aria-hidden="true"
            />

            <h2>
              Доставка
            </h2>
          </div>

          {delivery ? (
            <dl className="order-details__list">
              <div>
                <dt>
                  Способ
                </dt>

                <dd>
                  {delivery.delivery_methods
                    ?.name
                    ?? "Не указан"}
                </dd>
              </div>

              <div>
                <dt>
                  Статус
                </dt>

                <dd>
                  {
                    DELIVERY_STATUS_LABELS[
                      delivery.status
                    ]
                    ?? delivery.status
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Получатель
                </dt>

                <dd>
                  {delivery.recipient_name}
                </dd>
              </div>

              <div>
                <dt>
                  Телефон
                </dt>

                <dd>
                  {delivery.phone}
                </dd>
              </div>

              <div>
                <dt>
                  Адрес
                </dt>

                <dd>
                  <MapPin
                    size={15}
                    aria-hidden="true"
                  />

                  {delivery.full_address}
                </dd>
              </div>

              {delivery.tracking_number && (
                <div>
                  <dt>
                    Трек-номер
                  </dt>

                  <dd>
                    {
                      delivery
                        .tracking_number
                    }
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p>
              Данные доставки отсутствуют.
            </p>
          )}
        </section>

        <section className="order-details__section">
          <div className="order-details__section-heading">
            <CreditCard
              size={21}
              aria-hidden="true"
            />

            <h2>
              Оплата
            </h2>
          </div>

          <dl className="order-details__list">
            <div>
              <dt>
                Способ
              </dt>

              <dd>
                {payment
                  ?.payment_methods
                  ?.name
                  ?? "Не указан"}
              </dd>
            </div>

            <div>
              <dt>
                Статус
              </dt>

              <dd>
                {
                  PAYMENT_STATUS_LABELS[
                    order.payment_status
                  ]
                  ?? order.payment_status
                }
              </dd>
            </div>

            {payment && (
              <div>
                <dt>
                  Сумма операции
                </dt>

                <dd>
                  {formatPrice(
                    payment.amount
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="order-details__section">
          <div className="order-details__section-heading">
            <CheckCircle2
              size={21}
              aria-hidden="true"
            />

            <h2>
              История статусов
            </h2>
          </div>

          <div className="order-timeline">
            {order.order_status_history.map(
              (historyItem) => (
                <div
                  key={historyItem.id}
                  className="order-timeline__item"
                >
                  <span />

                  <div>
                    <strong>
                      {
                        ORDER_STATUS_LABELS[
                          historyItem
                            .new_status
                        ]
                        ?? historyItem
                          .new_status
                      }
                    </strong>

                    <small>
                      {formatDate(
                        historyItem
                          .changed_at
                      )}
                    </small>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </div>

      <section className="order-details__summary">
        <dl>
          <div>
            <dt>
              Товары
            </dt>

            <dd>
              {formatPrice(
                order.items_total
              )}
            </dd>
          </div>

          <div>
            <dt>
              Доставка
            </dt>

            <dd>
              {formatPrice(
                order.delivery_cost
              )}
            </dd>
          </div>

          <div>
            <dt>
              Итого
            </dt>

            <dd>
              {formatPrice(
                order.total_amount
              )}
            </dd>
          </div>
        </dl>
      </section>

      {order.comment && (
        <section className="order-details__section">
          <h2>
            Комментарий
          </h2>

          <p>
            {order.comment}
          </p>
        </section>
      )}
    </div>
  );
}
