import { useState } from "react";
import { apiRequest } from "../../shared/api/client";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const apiBase = import.meta.env.VITE_API_BASE_URL as string;
const control: React.CSSProperties = { height: 42, border: "1px solid #d6d2c9", borderRadius: 8, padding: "0 12px", background: "var(--admin-surface, #fffdf9)", color: "inherit", font: "inherit", boxSizing: "border-box" };
const action: React.CSSProperties = { ...control, cursor: "pointer", padding: "0 20px", fontWeight: 600, background: "#e9eee7", borderColor: "#c7d2c6" };
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 500 };
function url(path: string, from: string, to: string) {
  const u = new URL(apiBase.replace(/\/$/, "") + path, window.location.origin);
  u.searchParams.set("from", from); u.searchParams.set("to", to);
  return u.toString();
}
export default function AdminAccountantReport() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return iso(d); });
  const [to, setTo] = useState(() => iso(new Date()));
  const [email, setEmail] = useState(() => localStorage.getItem("accountant-report-email") ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  function validate() {
    if (!from || !to || from > to) throw new Error("Проверьте выбранный период");
  }
  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage(""); setError(false);
    try { validate(); await task(); }
    catch (e) { setError(true); setMessage(e instanceof Error ? e.message : "Не удалось выполнить операцию"); }
    finally { setBusy(false); }
  }
  function download() {
    void run(async () => {
      const response = await fetch(url("/moderator/accountant-report/download", from, to), { credentials: "include" });
      if (!response.ok) throw new Error("Не удалось скачать отчёт");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = href; a.download = "accountant-" + from + "-" + to + ".xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setMessage("Excel-файл подготовлен");
    });
  }
  function send() {
    void run(async () => {
      if (!email.trim()) throw new Error("Укажите email бухгалтера");
      if (!window.confirm("Отправить отчёт за " + from + " — " + to + " на " + email + "?")) return;
      await apiRequest("/moderator/accountant-report/send", { method: "POST", body: JSON.stringify({ from, to, email: email.trim() }) });
      localStorage.setItem("accountant-report-email", email.trim());
      setMessage("Отчёт отправлен на " + email.trim());
    });
  }
  return <section className="admin-analytics-card">
    <h2>Отчёт для бухгалтера</h2>
    <p className="admin-analytics-note">Выберите период для формирования финансового отчёта в Excel.</p>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end", marginTop: 18 }}>
      <label style={field}>Дата начала<input style={control} type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label style={field}>Дата окончания<input style={control} type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <button style={action} disabled={busy} onClick={download}>Скачать Excel</button>
    </div>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end", marginTop: 18 }}>
      <label style={{ ...field, flex: "1 1 260px", maxWidth: 420 }}>Email бухгалтера
        <input style={{ ...control, width: "100%" }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="accountant@example.ru" />
      </label>
      <button style={action} disabled={busy || !email.trim()} onClick={send}>Отправить на почту</button>
    </div>
    {message && <p role="status" style={{ marginTop: 12, color: error ? "#a33c32" : "inherit" }}>{message}</p>}
  </section>;
}
