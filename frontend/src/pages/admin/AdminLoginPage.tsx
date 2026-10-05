import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../features/admin/AdminAuthProvider";

export default function AdminLoginPage() {
  const { username: authenticatedUser, loading, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && authenticatedUser) return <Navigate to="/admin" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      const from = (location.state as { from?: string } | null)?.from ?? "/admin";
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить вход");
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
          <span>Панель управления магазином</span>
        </div>
        <h1>Вход администратора</h1>
        <label>Логин<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>Пароль
          <span style={{ position: "relative", display: "block" }}>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: "3rem" }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              style={{ position: "absolute", right: ".55rem", top: "50%", transform: "translateY(-50%)", width: "2rem", height: "2rem", padding: 0, border: 0, background: "transparent", color: "currentColor", display: "grid", placeItems: "center", cursor: "pointer" }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a15.6 15.6 0 0 1-2.1 2.7"/><path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a10.8 10.8 0 0 0 3.4-.5"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>
              )}
            </button>
          </span>
        </label>
        {error && <p className="admin-form-error">{error}</p>}
        <Link className="admin-login-link" to="/admin/forgot-password">Забыли пароль?</Link>
        <button type="submit" disabled={submitting}>{submitting ? "Вход…" : "Войти"}</button>
      </form>
    </main>
  );
}
