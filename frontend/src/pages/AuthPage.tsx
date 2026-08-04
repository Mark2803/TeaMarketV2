import "../shared/styles/auth.css";

import {
  useEffect,
  useState
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  ShieldCheck,
  X
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import {
  useAuth
} from "../features/auth/AuthProvider";

function formatPhoneInput(
  value: string
): string {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (!digits) {
    return "";
  }

  const normalizedDigits =
    digits.startsWith("8")
      ? `7${digits.slice(1)}`
      : digits.startsWith("7")
        ? digits
        : `7${digits}`;

  const country = normalizedDigits.slice(0, 1);
  const area = normalizedDigits.slice(1, 4);
  const first = normalizedDigits.slice(4, 7);
  const second = normalizedDigits.slice(7, 9);
  const third = normalizedDigits.slice(9, 11);

  let result = `+${country}`;

  if (area) {
    result += ` (${area}`;
  }

  if (area.length === 3) {
    result += ")";
  }

  if (first) {
    result += ` ${first}`;
  }

  if (second) {
    result += `-${second}`;
  }

  if (third) {
    result += `-${third}`;
  }

  return result;
}

function getPhoneDigits(
  value: string
): string {
  return value.replace(/\D/g, "");
}

export default function AuthPage() {
  const navigate = useNavigate();

  const {
    session,
    step,
    pendingPhone,
    isInitializing,
    requestCode,
    confirmCode,
    resetAuthFlow
  } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    if (
      isInitializing
      || !session.isAuthenticated
      || !session.user
    ) {
      return;
    }

    navigate(
      session.user.profileCompleted
        ? "/profile"
        : "/profile/details",
      {
        replace: true
      }
    );
  }, [
    isInitializing,
    navigate,
    session
  ]);

  const cancelAuth = () => {
    resetAuthFlow();
    setPhone("");
    setCode("");
    setError(null);

    navigate("/profile", {
      replace: true
    });
  };

  const submitPhone = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const phoneDigits =
      getPhoneDigits(phone);

    if (phoneDigits.length !== 11) {
      setError(
        "Введите номер телефона полностью."
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await requestCode(phoneDigits);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось запросить код."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCode = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (code.length !== 6) {
      setError(
        "Введите код из шести цифр."
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result =
        await confirmCode(code);

      navigate(
        result === "profile-details"
          ? "/profile/details"
          : "/profile",
        {
          replace: true
        }
      );
    } catch (confirmationError) {
      setError(
        confirmationError instanceof Error
          ? confirmationError.message
          : "Не удалось подтвердить код."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToPhone = () => {
    resetAuthFlow();
    setCode("");
    setError(null);
  };

  if (isInitializing) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="auth-card__heading">
            <h1>Проверяем сессию</h1>
            <p>Подождите несколько секунд.</p>
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
          aria-label="Отменить вход и вернуться в профиль"
          onClick={cancelAuth}
        >
          <ArrowLeft
            size={22}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </button>

        <span>Вход</span>

        <button
          type="button"
          className="auth-page__cancel"
          onClick={cancelAuth}
        >
          Отмена
        </button>
      </div>

      <section className="auth-card">
        <div className="auth-card__icon">
          {step === "code" ? (
            <ShieldCheck
              size={32}
              strokeWidth={1.6}
              aria-hidden="true"
            />
          ) : (
            <Phone
              size={32}
              strokeWidth={1.6}
              aria-hidden="true"
            />
          )}
        </div>

        {step === "code" ? (
          <>
            <div className="auth-card__heading">
              <h1>Введите код</h1>

              <p>
                Код отправлен на номер{" "}
                <strong>
                  {formatPhoneInput(pendingPhone)}
                </strong>
              </p>
            </div>

            <form
              className="auth-form"
              onSubmit={submitCode}
            >
              <label
                className="auth-field"
                htmlFor="auth-code"
              >
                <span>Код подтверждения</span>

                <input
                  id="auth-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  placeholder="000000"
                  autoFocus
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setCode(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    );
                    setError(null);
                  }}
                />
              </label>

              <p className="auth-form__hint">
                В режиме разработки код выводится в консоли backend.
              </p>

              {error && (
                <p
                  className="auth-form__error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="auth-form__submit"
                disabled={isSubmitting}
              >
                <CheckCircle2
                  size={20}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {isSubmitting
                  ? "Проверяем..."
                  : "Подтвердить"}
              </button>

              <button
                type="button"
                className="auth-form__secondary"
                disabled={isSubmitting}
                onClick={returnToPhone}
              >
                Изменить номер телефона
              </button>

              <button
                type="button"
                className="auth-form__cancel"
                disabled={isSubmitting}
                onClick={cancelAuth}
              >
                <X
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Отмена
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="auth-card__heading">
              <h1>Вход по телефону</h1>

              <p>
                Введите номер телефона. Если покупателя ещё нет, профиль будет создан автоматически.
              </p>
            </div>

            <form
              className="auth-form"
              onSubmit={submitPhone}
            >
              <label
                className="auth-field"
                htmlFor="auth-phone"
              >
                <span>Номер телефона</span>

                <input
                  id="auth-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  placeholder="+7 (999) 000-00-00"
                  autoFocus
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setPhone(
                      formatPhoneInput(
                        event.target.value
                      )
                    );
                    setError(null);
                  }}
                />
              </label>

              {error && (
                <p
                  className="auth-form__error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="auth-form__submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Запрашиваем..."
                  : "Получить код"}
              </button>

              <button
                type="button"
                className="auth-form__cancel"
                disabled={isSubmitting}
                onClick={cancelAuth}
              >
                <X
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Отмена
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
