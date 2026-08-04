import {
  ChevronRight,
  Clock3,
  PackageCheck,
  ReceiptText
} from "lucide-react";

import {
  useEffect,
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
  getCustomerOrders
} from "../shared/api/orders";

import type {
  CustomerOrderListItemApi
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

export default function OrdersPage() {
  const {
    session,
    isInitializing
  } = useAuth();

  const [orders, setOrders] =
    useState<CustomerOrderListItemApi[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!session.isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await getCustomerOrders();

        if (!cancelled) {
          setOrders(response.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить заказы"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [session.isAuthenticated]);

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

  return (
    <div className="orders-page">
      <header className="orders-page__header">
        <span>
          Личный кабинет
        </span>

        <h1>
          Мои заказы
        </h1>

        <p>
          История заказов хранится в PostgreSQL.
        </p>
      </header>

      {isLoading && (
        <section className="orders-state">
          Загружаем заказы…
        </section>
      )}

      {error && (
        <section className="orders-state orders-state--error">
          <h2>
            Не удалось загрузить заказы
          </h2>

          <p>
            {error}
          </p>
        </section>
      )}

      {!isLoading
        && !error
        && orders.length === 0 && (
          <section className="orders-state">
            <span className="orders-state__icon">
              <ReceiptText
                size={36}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </span>

            <h2>
              Заказов пока нет
            </h2>

            <p>
              После оформления заказа он появится здесь.
            </p>

            <Link
              to="/catalog"
              className="orders-state__action"
            >
              Перейти в каталог
            </Link>
          </section>
        )}

      {!isLoading
        && !error
        && orders.length > 0 && (
          <div className="orders-list">
            {orders.map(
              (order) => (
                <Link
                  key={order.id}
                  to={`/profile/orders/${encodeURIComponent(order.order_number)}`}
                  className="order-card"
                >
                  <div className="order-card__top">
                    <div>
                      <span>
                        Заказ
                      </span>

                      <strong>
                        {order.order_number}
                      </strong>
                    </div>

                    <ChevronRight
                      size={21}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="order-card__meta">
                    <span>
                      <Clock3
                        size={15}
                        aria-hidden="true"
                      />

                      {formatDate(
                        order.ordered_at
                      )}
                    </span>

                    <span>
                      <PackageCheck
                        size={15}
                        aria-hidden="true"
                      />

                      {
                        order.order_items
                          .length
                      }
                      {" "}
                      поз.
                    </span>
                  </div>

                  <div className="order-card__statuses">
                    <span className="order-status">
                      {
                        ORDER_STATUS_LABELS[
                          order.status
                        ]
                        ?? order.status
                      }
                    </span>

                    <span className="order-payment-status">
                      {
                        PAYMENT_STATUS_LABELS[
                          order.payment_status
                        ]
                        ?? order.payment_status
                      }
                    </span>
                  </div>

                  <div className="order-card__bottom">
                    <span>
                      Итого
                    </span>

                    <strong>
                      {formatPrice(
                        order.total_amount
                      )}
                    </strong>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
    </div>
  );
}
