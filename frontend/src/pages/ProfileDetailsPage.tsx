import {
  useEffect,
  useState
} from "react";

import {
  ArrowLeft,
  Mail,
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
      setError("Введите имя.");
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
        email: normalizedEmail
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
              : "Заполните профиль"}
          </h1>

          <p>
            Имя используется при оформлении заказа. Электронная почта необязательна.
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
            <span>Имя</span>

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
                placeholder="Ваше имя"
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
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                placeholder="Необязательно"
              />
            </div>
          </label>

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
