import {
  useEffect,
  useState
} from "react";

import {
  ArrowLeft,
  Mail,
  Phone,
  Send,
  UserRound
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import {
  useAuth
} from "../features/auth/AuthProvider";

import "../shared/styles/auth.css";

function isValidEmail(
  email: string
): boolean {
  return (
    !email
    || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export default function ProfileDetailsPage() {
  const navigate = useNavigate();

  const {
    session,
    isInitializing,
    updateProfile
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [emailMarketing, setEmailMarketing] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (
      !session.isAuthenticated
      || !session.user
    ) {
      navigate("/auth", {
        replace: true
      });
      return;
    }

    setName(session.user.name);
    setEmail(session.user.email);
    setPhone(session.user.phone);
    setUsername(session.user.username ?? "");
    setEmailMarketing(
      session.user.profileCompleted
        ? session.user.emailMarketing
        : true
    );
  }, [
    isInitializing,
    navigate,
    session
  ]);

  const submitProfile = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email.trim();

    if (normalizedName.length < 2) {
      setError("Введите ФИО.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Проверьте электронную почту."
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateProfile({
        name: normalizedName,
        email: normalizedEmail,
        phone: phone.trim(),
        username: username.trim(),
        emailMarketing
      });

      navigate("/profile", {
        replace: true
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось сохранить профиль."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    isInitializing
    || !session.user
  ) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="auth-card__heading">
            <h1>Загрузка профиля</h1>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page__toolbar">
        <button
          type="button"
          className="auth-page__back"
          aria-label="Вернуться в профиль"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </button>

        <span>Личные данные</span>

        <button
          type="button"
          className="auth-page__cancel"
          onClick={() => navigate("/profile")}
        >
          Отмена
        </button>
      </div>

      <section className="auth-card">
        <div className="auth-card__icon">
          <UserRound
            size={32}
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </div>

        <div className="auth-card__heading">
          <h1>
            {session.user.profileCompleted
              ? "Личные данные"
              : "Создание профиля"}
          </h1>

          <p>
            ФИО используется при оформлении заказа. Телефон и Telegram заполнять необязательно.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={submitProfile}
        >
          <label
            className="auth-field"
            htmlFor="profile-name"
          >
            <span>ФИО</span>

            <div className="auth-field__control">
              <UserRound
                size={18}
                strokeWidth={1.7}
                aria-hidden="true"
              />

              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={name}
                disabled={isSubmitting}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder="Фамилия Имя Отчество"
                autoFocus
              />
            </div>
          </label>

          <label
            className="auth-field"
            htmlFor="profile-email"
          >
            <span>Электронная почта</span>

            <div className="auth-field__control">
              <Mail
                size={18}
                strokeWidth={1.7}
                aria-hidden="true"
              />

              <input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={email}
                disabled
                readOnly
                placeholder="Электронная почта"
              />
            </div>
          </label>

          <label
            className="auth-field"
            htmlFor="profile-phone"
          >
            <span>Номер телефона <small>(необязательно)</small></span>

            <div className="auth-field__control">
              <Phone
                size={18}
                strokeWidth={1.7}
                aria-hidden="true"
              />

              <input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                disabled={isSubmitting}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(null);
                }}
                placeholder="+7 999 123-45-67"
              />
            </div>
          </label>

          <label
            className="auth-field"
            htmlFor="profile-telegram"
          >
            <span>Telegram username <small>(необязательно)</small></span>

            <div className="auth-field__control">
              <Send
                size={18}
                strokeWidth={1.7}
                aria-hidden="true"
              />

              <input
                id="profile-telegram"
                type="text"
                autoComplete="off"
                value={username}
                disabled={isSubmitting}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError(null);
                }}
                placeholder="@username"
              />
            </div>
          </label>

          <label className="auth-consent">
            <input
              type="checkbox"
              checked={emailMarketing}
              disabled={isSubmitting}
              onChange={(event) => setEmailMarketing(event.target.checked)}
            />
            <span>
              Получать новости, акции и специальные предложения по электронной почте
            </span>
          </label>

          <p className="auth-consent__hint">
            Необязательно. Согласие можно изменить в профиле в любое время. Сервисные письма о входе и заказах будут приходить независимо от этой настройки.
          </p>

          {error && (
            <div
              className="auth-form__error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Сохраняем..."
              : "Сохранить"}
          </button>
        </form>
      </section>
    </div>
  );
}
