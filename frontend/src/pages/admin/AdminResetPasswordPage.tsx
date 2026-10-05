import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmAdminPasswordReset } from "../../shared/api/admin";

export default function AdminResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) return setError("В ссылке отсутствует токен восстановления");
    if (password.length < 10) return setError("Пароль должен содержать не менее 10 символов");
    if (password !== confirmPassword) return setError("Пароли не совпадают");

    setSubmitting(true);
    try {
      await confirmAdminPasswordReset(token, password);
      setDone(true);
      setPassword("");
      setConfirmPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить пароль");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-brand">
          <div className="admin-login-brand-row">
            <img className="admin-login-brand-logo" src="/brand-logo.svg" alt="" />
            <strong>Чайный Мастер</strong>
          </div>
          <span>Восстановление доступа</span>
        </div>
        <h1>Новый пароль</h1>
        {done ? (
          <>
            <p className="admin-form-success">Пароль успешно изменён. Теперь можно войти с новым паролем.</p>
            <Link className="admin-login-link" to="/admin/login">Перейти ко входу</Link>
          </>
        ) : (
          <>
            <label>Новый пароль
              <span style={{ position: "relative", display: "block" }}>
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} style={{ paddingRight: "3rem" }} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} title={showPassword ? "Скрыть пароль" : "Показать пароль"} style={{ position: "absolute", right: ".55rem", top: "50%", transform: "translateY(-50%)", width: "2rem", height: "2rem", padding: 0, border: 0, background: "transparent", color: "currentColor", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a15.6 15.6 0 0 1-2.1 2.7"/><path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a10.8 10.8 0 0 0 3.4-.5"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                  )}
                </button>
              </span>
            </label>
            <label>Повторите пароль
              <span style={{ position: "relative", display: "block" }}>
                <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={10} style={{ paddingRight: "3rem" }} required />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"} title={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"} style={{ position: "absolute", right: ".55rem", top: "50%", transform: "translateY(-50%)", width: "2rem", height: "2rem", padding: 0, border: 0, background: "transparent", color: "currentColor", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a15.6 15.6 0 0 1-2.1 2.7"/><path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a10.8 10.8 0 0 0 3.4-.5"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                  )}
                </button>
              </span>
            </label>
            {error && <p className="admin-form-error">{error}</p>}
            <button type="submit" disabled={submitting || !token}>{submitting ? "Сохранение…" : "Установить новый пароль"}</button>
            <Link className="admin-login-link" to="/admin/login">Вернуться ко входу</Link>
          </>
        )}
      </form>
    </main>
  );
}
