import { useEffect, useState } from "react";
import { apiRequest } from "../../shared/api/client";

type Settings = {
  email_enabled: boolean;
  email_recipient: string;
  telegram_enabled: boolean;
  telegram_chat_id: string;
  max_enabled: boolean;
  max_chat_id: string;
};

const empty: Settings = {
  email_enabled: false,
  email_recipient: "",
  telegram_enabled: false,
  telegram_chat_id: "",
  max_enabled: false,
  max_chat_id: "",
};

export default function AdminOrderAlertsSettings() {
  const [value, setValue] = useState<Settings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void apiRequest<{ data: Settings }>("/moderator/notifications/admin-order-alerts")
      .then((response) => setValue(response.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<Settings>) => setValue((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiRequest<{ data: Settings }>("/moderator/notifications/admin-order-alerts", {
        method: "PUT",
        body: JSON.stringify(value),
      });
      setValue(response.data);
      setMessage("Настройки сохранены");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { width: "100%", minWidth: 0, maxWidth: 460, boxSizing: "border-box" as const };
  const rowStyle = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const };
  const channelStyle = { display: "grid", gap: 12, padding: "18px 0", borderBottom: "1px solid var(--border-color, #e4ddd3)" };

  return (
    <section className="notification-panel admin-order-alerts">
      <h2>Уведомления администратору об оплаченных заказах</h2>
      <p>Уведомление отправляется после подтверждения успешной оплаты.</p>
      {loading ? <p>Загрузка настроек…</p> : (
        <div style={{ display: "grid", gap: 4, maxWidth: 650 }}>
          <div style={channelStyle}>
            <label style={rowStyle}>
              <input type="checkbox" checked={value.telegram_enabled} onChange={(event) => update({ telegram_enabled: event.target.checked })} />
              <strong>Telegram</strong>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Chat ID администратора</span>
              <input style={fieldStyle} value={value.telegram_chat_id} onChange={(event) => update({ telegram_chat_id: event.target.value })} placeholder="Например, 123456789" />
            </label>
            <small>Для отправки сообщений на сервере должен быть настроен TELEGRAM_BOT_TOKEN.</small>
          </div>
          <div style={channelStyle}>
            <label style={rowStyle}>
              <input type="checkbox" checked={value.email_enabled} onChange={(event) => update({ email_enabled: event.target.checked })} />
              <strong>Email</strong>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Адрес получателя</span>
              <input type="email" style={fieldStyle} value={value.email_recipient} onChange={(event) => update({ email_recipient: event.target.value })} placeholder="admin@example.ru" />
            </label>
          </div>
          <div style={{ ...channelStyle, borderBottom: "none" }}>
            <label style={rowStyle}>
              <input type="checkbox" disabled checked={false} readOnly />
              <strong>MAX</strong>
              <span>Подключение в разработке</span>
            </label>
          </div>
          {error && <p className="admin-error-box">{error}</p>}
          {message && <p className="admin-success-box">{message}</p>}
          <div>
            <button type="button" className="admin-primary-button" disabled={saving} onClick={() => void save()}>
              {saving ? "Сохранение…" : "Сохранить настройки"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
