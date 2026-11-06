import { useEffect, useState } from "react";
import { apiRequest } from "../../shared/api/client";

type Channel = "telegram" | "whatsapp" | "max";
type Messenger = { channel: Channel; contact: string; is_enabled: boolean };
const names: Record<Channel, string> = { telegram: "Telegram", whatsapp: "WhatsApp", max: "MAX" };
const hints: Record<Channel, string> = {
  telegram: "https://t.me/TeaMasterTeam",
  whatsapp: "https://wa.me/79218855660",
  max: "https://max.ru/..."
};
export default function StorefrontMessengersSettings() {
  const [items, setItems] = useState<Messenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest<{ data: Messenger[] }>("/messengers")
      .then(r => setItems(r.data))
      .catch(e => setError(e instanceof Error ? e.message : "Не удалось загрузить контакты"))
      .finally(() => setLoading(false));
  }, []);
  const edit = (channel: Channel, patch: Partial<Messenger>) =>
    setItems(previous => previous.map(item => item.channel === channel ? { ...item, ...patch } : item));
  const save = async () => {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await apiRequest<{ data: Messenger[] }>("/moderator/notifications/storefront-messengers", {
        method: "PUT", body: JSON.stringify({ data: items })
      });
      setItems(response.data);
      setMessage("Контакты магазина сохранены.");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить"); }
    finally { setSaving(false); }
  };
  return <section className="notification-panel storefront-messengers">
    <h2>Мессенджеры магазина</h2>
    <p>Контакты плавающей кнопки связи на сайте. Эти настройки не относятся к рассылкам.</p>
    {loading ? <p>Загрузка…</p> : items.map(item => <div className="storefront-messenger-row" key={item.channel}>
      <div className="storefront-messenger-title">
        <strong>{names[item.channel]}</strong>
        <label><input type="checkbox" checked={item.is_enabled} onChange={e => edit(item.channel, { is_enabled: e.target.checked })}/> Показывать</label>
      </div>
      <input type="url" aria-label={`Ссылка ${names[item.channel]}`} value={item.contact}
        placeholder={hints[item.channel]} onChange={e => edit(item.channel, { contact: e.target.value })}/>
      {item.channel === "max" && !item.contact && <small>Пункт будет виден на сайте, но без перехода.</small>}
    </div>)}
    {error && <p role="alert" className="admin-error-box">{error}</p>}
    {message && <p role="status" className="admin-success-box">{message}</p>}
    <div><button type="button" className="admin-primary-button" disabled={loading || saving || !items.length} onClick={() => void save()}>
      {saving ? "Сохранение…" : "Сохранить контакты"}
    </button></div>
  </section>;
}
