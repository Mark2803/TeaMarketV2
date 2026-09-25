import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../features/admin/AdminAuthProvider";

export default function AdminLoginPage() {
  const { username: authenticatedUser, loading, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
            <img className="admin-login-brand-logo" src="/bimi/logo.svg" alt="" />
            <strong>Чайный Мастер</strong>
          </div>
          <span>Панель управления магазином</span>
        </div>
        <h1>Вход администратора</h1>
        <label>Логин<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="admin-form-error">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Вход…" : "Войти"}</button>
      </form>
    </main>
  );
}
