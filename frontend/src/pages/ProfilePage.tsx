import "../shared/styles/profile.css";

import {
  ChevronRight,
  LogOut,
  PackageCheck,
  Phone,
  ShieldCheck,
  UserRound
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import {
  useAuth
} from "../features/auth/AuthProvider";

function formatPhone(
  phone: string
): string {
  const digits =
    phone.replace(/\D/g, "");

  if (digits.length !== 11) {
    return phone;
  }

  return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

function GuestProfile() {
  return (
    <div className="profile-page profile-page--guest">
      <header className="profile-page__header">
        <span className="profile-page__eyebrow">
          Личный кабинет
        </span>

        <h1>Профиль</h1>
      </header>

      <section className="profile-guest-card">
        <div className="profile-guest-card__icon">
          <UserRound
            size={34}
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </div>

        <div className="profile-guest-card__content">
          <h2>
            Войдите по номеру телефона
          </h2>

          <p>
            Профиль создаётся в базе данных после подтверждения номера.
          </p>
        </div>

        <Link
          to="/auth"
          className="profile-primary-action"
        >
          <Phone
            size={19}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          Войти или зарегистрироваться
        </Link>

        <div className="profile-guest-card__note">
          <ShieldCheck
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <span>
            Используется серверная авторизация и сессия покупателя.
          </span>
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  const {
    session,
    isInitializing,
    logout
  } = useAuth();

  if (isInitializing) {
    return (
      <div className="profile-page">
        <section className="profile-user-card">
          Загружаем профиль...
        </section>
      </div>
    );
  }

  if (
    !session.isAuthenticated
    || !session.user
  ) {
    return <GuestProfile />;
  }

  const displayName =
    session.user.name
    || "Профиль не заполнен";

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <span className="profile-page__eyebrow">
          Личный кабинет
        </span>

        <h1>Профиль</h1>
      </header>

      <section className="profile-user-card">
        <div className="profile-user-card__avatar">
          <UserRound
            size={30}
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </div>

        <div className="profile-user-card__info">
          <strong>{displayName}</strong>

          {session.user.phone && (
            <span>{formatPhone(session.user.phone)}</span>
          )}

          {session.user.email && (
            <span>
              {session.user.email}
            </span>
          )}
        </div>

        <span className="profile-user-card__status">
          <ShieldCheck
            size={16}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          {session.user.email ? "Email подтверждён" : "Номер подтверждён"}
        </span>
      </section>

      <section className="profile-menu">
        <h2 className="profile-menu__title">
          Управление профилем
        </h2>

        <div className="profile-menu__list">
          <Link
            to="/profile/orders"
            className="profile-menu__item"
          >
            <span className="profile-menu__icon">
              <PackageCheck
                size={21}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </span>

            <span className="profile-menu__content">
              <strong>Мои заказы</strong>

              <small>
                История и статусы заказов
              </small>
            </span>

            <ChevronRight
              className="profile-menu__arrow"
              size={20}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </Link>

          <Link
            to="/profile/details"
            className="profile-menu__item"
          >
            <span className="profile-menu__icon">
              <UserRound
                size={21}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </span>

            <span className="profile-menu__content">
              <strong>Личные данные</strong>

              <small>
                Имя, email, телефон и Telegram
              </small>
            </span>

            <ChevronRight
              className="profile-menu__arrow"
              size={20}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      <button
        type="button"
        className="profile-logout"
        onClick={() => {
          void logout();
        }}
      >
        <LogOut
          size={19}
          strokeWidth={1.8}
          aria-hidden="true"
        />

        Выйти из профиля
      </button>
    </div>
  );
}
