import "../shared/styles/auth.css";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, step, pendingEmail, isInitializing, requestCode, confirmCode, resetAuthFlow } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing && session.isAuthenticated && session.user) {
      navigate(session.user.profileCompleted ? "/profile" : "/profile/details", { replace: true });
    }
  }, [isInitializing, navigate, session]);

  const cancelAuth = () => { resetAuthFlow(); setEmail(""); setCode(""); setError(null); navigate("/profile", { replace: true }); };

  const submitEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null); setIsSubmitting(true);
    try { await requestCode(email); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось отправить код."); }
    finally { setIsSubmitting(false); }
  };

  const submitCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) { setError("Введите код из шести цифр."); return; }
    setError(null); setIsSubmitting(true);
    try {
      const result = await confirmCode(code);
      navigate(result === "profile-details" ? "/profile/details" : "/profile", { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось подтвердить код."); }
    finally { setIsSubmitting(false); }
  };

  if (isInitializing) return <div className="auth-page"><section className="auth-card"><div className="auth-card__heading"><h1>Проверяем сессию</h1><p>Подождите несколько секунд.</p></div></section></div>;

  return <div className="auth-page">
    <div className="auth-page__toolbar">
      <button type="button" className="auth-page__back" aria-label="Отменить вход и вернуться в профиль" onClick={cancelAuth}><ArrowLeft size={22} strokeWidth={1.8}/></button>
      <span>Вход</span><button type="button" className="auth-page__cancel" onClick={cancelAuth}>Отмена</button>
    </div>
    <section className="auth-card">
      <div className="auth-card__icon">{step === "code" ? <ShieldCheck size={32} strokeWidth={1.6}/> : <Mail size={32} strokeWidth={1.6}/>}</div>
      {step === "code" ? <>
        <div className="auth-card__heading"><h1>Введите код</h1><p>Код отправлен на <strong>{pendingEmail}</strong></p></div>
        <form className="auth-form" onSubmit={submitCode}>
          <label className="auth-field" htmlFor="auth-code"><span>Код подтверждения</span><input id="auth-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder="000000" autoFocus disabled={isSubmitting} onChange={(e)=>{setCode(e.target.value.replace(/\D/g, "").slice(0,6));setError(null);}}/></label>
          <p className="auth-form__hint">Код действует 5 минут.</p>
          {error && <p className="auth-form__error" role="alert">{error}</p>}
          <button type="submit" className="auth-form__submit" disabled={isSubmitting}><CheckCircle2 size={20} strokeWidth={1.8}/>{isSubmitting ? "Проверяем..." : "Подтвердить"}</button>
          <button type="button" className="auth-form__secondary" disabled={isSubmitting} onClick={()=>{resetAuthFlow();setCode("");setError(null);}}>Изменить email</button>
          <button type="button" className="auth-form__cancel" disabled={isSubmitting} onClick={cancelAuth}><X size={18} strokeWidth={1.8}/>Отмена</button>
        </form>
      </> : <>
        <div className="auth-card__heading"><h1>Вход по электронной почте</h1><p>Введите email. Мы отправим шестизначный код для входа. Если вы у нас впервые, после подтверждения email нужно будет заполнить профиль.</p></div>
        <form className="auth-form" onSubmit={submitEmail}>
          <label className="auth-field" htmlFor="auth-email"><span>Email</span><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} placeholder="name@example.com" autoFocus disabled={isSubmitting} onChange={(e)=>{setEmail(e.target.value);setError(null);}}/></label>
          {error && <p className="auth-form__error" role="alert">{error}</p>}
          <button type="submit" className="auth-form__submit" disabled={isSubmitting}>{isSubmitting ? "Отправляем..." : "Получить код"}</button>
          <button type="button" className="auth-form__cancel" disabled={isSubmitting} onClick={cancelAuth}><X size={18} strokeWidth={1.8}/>Отмена</button>
        </form>
      </>}
    </section>
  </div>;
}
