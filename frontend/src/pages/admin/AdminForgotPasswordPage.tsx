import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestAdminPasswordReset } from "../../shared/api/admin";

export default function AdminForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await requestAdminPasswordReset();
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить письмо");
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
        <h1>Забыли пароль?</h1>
        <p className="admin-login-help">Ссылка для установки нового пароля будет отправлена на корпоративную почту администратора.</p>
        {error && <p className="admin-form-error">{error}</p>}
        {message && <p className="admin-form-success">{message}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Отправка…" : "Отправить ссылку"}</button>
        <Link className="admin-login-link" to="/admin/login">Вернуться ко входу</Link>
      </form>
    </main>
  );
}
