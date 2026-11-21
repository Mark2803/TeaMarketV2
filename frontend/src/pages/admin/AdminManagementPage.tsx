import { KeyRound, Library, Lock, LockKeyhole, Mail } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import {
  getManagementStatus,
  getManagementTools,
  lockManagement,
  requestManagementPinCode,
  setManagementPin,
  unlockManagement,
} from "../../shared/api/admin";
import type { ManagementStatus, ManagementTool } from "../../shared/api/admin";

/**
 * Раздел «Менеджмент»: закрытая библиотека служебных инструментов.
 * Токен доступа хранится только в памяти этой страницы —
 * при каждом входе в раздел PIN вводится заново.
 */
type Mode = "loading" | "locked" | "setup" | "open";

const card: CSSProperties = { maxWidth: 460, display: "grid", gap: 14 };
const pinInput: CSSProperties = { fontSize: 24, letterSpacing: "0.4em", textAlign: "center", padding: "12px 14px" };

export default function AdminManagementPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [status, setStatus] = useState<ManagementStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tools, setTools] = useState<ManagementTool[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const loadStatus = useCallback(async () => {
    setError("");
    try {
      const response = await getManagementStatus();
      setStatus(response.data);
      setMode(response.data.pinSet ? "locked" : "setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить раздел.");
      setMode("locked");
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    // Уход со страницы — закрываем доступ на сервере.
    return () => {
      if (tokenRef.current) void lockManagement(tokenRef.current).catch(() => undefined);
    };
  }, [loadStatus]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const unlock = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const response = await unlockManagement(pin);
      tokenRef.current = response.data.token;
      setToken(response.data.token);
      setPin("");
      const list = await getManagementTools(response.data.token);
      setTools(list.data);
      setMode("open");
    });
  };

  const sendCode = () => void run(async () => {
    const response = await requestManagementPinCode();
    setCodeSent(true);
    setInfo(`Код отправлен на ${response.data.email}. Он действует 15 минут.`);
  });

  const savePin = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(newPin)) { setError("PIN — от 4 до 8 цифр."); return; }
    if (newPin !== newPin2) { setError("PIN-коды не совпадают."); return; }
    void run(async () => {
      await setManagementPin(code.trim(), newPin);
      if (tokenRef.current) await lockManagement(tokenRef.current).catch(() => undefined);
      tokenRef.current = null;
      setToken(null);
      setCode(""); setNewPin(""); setNewPin2(""); setCodeSent(false);
      setStatus((s) => (s ? { ...s, pinSet: true } : s));
      setMode("locked");
      setInfo("PIN сохранён. Введите его, чтобы открыть раздел.");
    });
  };

  const close = () => void run(async () => {
    if (token) await lockManagement(token).catch(() => undefined);
    tokenRef.current = null;
    setToken(null);
    setTools([]);
    setMode("locked");
  });

  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 8);

  return (
    <div className="admin-management-page">
      <div className="admin-page-heading">
        <div>
          <h1>Менеджмент</h1>
          <p>Закрытая библиотека служебных инструментов для управления бизнесом.</p>
        </div>
        {mode === "open" ? (
          <button type="button" className="admin-secondary-button" onClick={close} disabled={busy}>
            <Lock size={16} /> Закрыть раздел
          </button>
        ) : null}
      </div>

      {error ? <p className="admin-products-error" role="alert">{error}</p> : null}
      {info ? <p role="status" style={{ color: "#276132" }}>{info}</p> : null}

      {mode === "loading" ? <p>Загрузка…</p> : null}

      {mode === "locked" && status?.pinSet ? (
        <form className="admin-analytics-card" style={card} onSubmit={unlock}>
          <h2 style={{ margin: 0, display: "flex", gap: 10, alignItems: "center" }}><LockKeyhole size={22} /> Введите PIN-код</h2>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-label="PIN-код"
            value={pin}
            onChange={(e) => setPin(digits(e.target.value))}
            style={pinInput}
          />
          <button type="submit" className="admin-primary-button" disabled={busy || pin.length < 4}>
            {busy ? "Проверка…" : "Открыть раздел"}
          </button>
          <button type="button" className="admin-secondary-button" onClick={() => { setMode("setup"); setError(""); setInfo(""); }}>
            Забыли PIN или хотите сменить?
          </button>
        </form>
      ) : null}

      {mode === "setup" ? (
        <form className="admin-analytics-card" style={card} onSubmit={savePin}>
          <h2 style={{ margin: 0, display: "flex", gap: 10, alignItems: "center" }}>
            <KeyRound size={22} /> {status?.pinSet ? "Смена PIN-кода" : "Установка PIN-кода"}
          </h2>
          <p style={{ margin: 0 }}>
            Для подтверждения отправим код на корпоративную почту {status?.email ?? "магазина"}.
          </p>
          <button type="button" className="admin-secondary-button" onClick={sendCode} disabled={busy}>
            <Mail size={16} /> {codeSent ? "Отправить код ещё раз" : "Отправить код на почту"}
          </button>
          {codeSent ? (
            <>
              <label className="admin-field">
                <span>Код из письма</span>
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              </label>
              <label className="admin-field">
                <span>Новый PIN (4–8 цифр)</span>
                <input type="password" inputMode="numeric" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} style={pinInput} />
              </label>
              <label className="admin-field">
                <span>Повторите PIN</span>
                <input type="password" inputMode="numeric" autoComplete="new-password" value={newPin2} onChange={(e) => setNewPin2(digits(e.target.value))} style={pinInput} />
              </label>
              <button type="submit" className="admin-primary-button" disabled={busy || code.length !== 6 || newPin.length < 4}>
                {busy ? "Сохранение…" : "Сохранить PIN"}
              </button>
            </>
          ) : null}
          {status?.pinSet ? (
            <button type="button" className="admin-secondary-button" onClick={() => { setMode(token ? "open" : "locked"); setError(""); setInfo(""); }}>
              Отмена
            </button>
          ) : null}
        </form>
      ) : null}

      {mode === "open" ? (
        <>
          {tools.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 18 }}>
              {tools.map((tool) => (
                <section key={tool.id} className="admin-analytics-card">
                  <h2 style={{ margin: 0 }}>{tool.title}</h2>
                  <p style={{ margin: "8px 0 0" }}>{tool.description}</p>
                </section>
              ))}
            </div>
          ) : (
            <section className="admin-analytics-card" style={{ ...card, maxWidth: 640 }}>
              <h2 style={{ margin: 0, display: "flex", gap: 10, alignItems: "center" }}><Library size={22} /> Библиотека пока пуста</h2>
              <p style={{ margin: 0 }}>Здесь будут служебные инструменты для управления магазином и бизнесом. Они доступны только после ввода PIN-кода.</p>
            </section>
          )}
          <p style={{ marginTop: 18 }}>
            <button type="button" className="admin-secondary-button" onClick={() => { setMode("setup"); setInfo(""); setError(""); }}>
              <KeyRound size={16} /> Сменить PIN
            </button>
          </p>
        </>
      ) : null}
    </div>
  );
}
