import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { apiRequest } from "../../shared/api/client";
import "./admin-delivery.css";
import YandexPickupMap from "../../shared/widgets/YandexPickupMap";

type YandexPoint = { id:string; name:string; address:string; city:string; availableForDropoff:boolean; operator?:string; latitude?:number|null; longitude?:number|null };
type Package = {
  id: string; code: string; inner_length_cm: string | number; inner_width_cm: string | number;
  inner_height_cm: string | number; tare_weight_g: string | number | null;
  is_active: boolean; sort_order: number;
};
type Form = { code: string; inner_length_cm: string; inner_width_cm: string; inner_height_cm: string;
  tare_weight_g: string; is_active: boolean; sort_order: string };
const blank: Form = { code: "", inner_length_cm: "", inner_width_cm: "", inner_height_cm: "", tare_weight_g: "", is_active: true, sort_order: "0" };
const sections = [
  { key: "shipments", label: "Отправления" },
  { key: "returns", label: "Возвраты" },
  { key: "packaging", label: "Упаковка" },
  { key: "dropoff-points", label: "ПВЗ отгрузки" },
];
function toForm(p: Package): Form { return {
  code: p.code, inner_length_cm: String(p.inner_length_cm), inner_width_cm: String(p.inner_width_cm), inner_height_cm: String(p.inner_height_cm),
  tare_weight_g: p.tare_weight_g == null ? "" : String(p.tare_weight_g),
  is_active: p.is_active, sort_order: String(p.sort_order)
}; }
function positive(value: string, required: boolean): number | null {
  if (!value.trim() && !required) return null;
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Размеры и вес должны быть положительными числами");
  return n;
}
export default function AdminDeliveryPage() {
  const { section } = useParams();
  type ShipmentRow = {order_number:string;payment_status:string;order_status:string;recipient_name:string|null;full_address:string|null;delivery_service:string|null;shipment_status:string|null;yandex_request_id:string|null;error_code:string|null;created_at:string};
  const [shipments,setShipments] = useState<ShipmentRow[]>([]);
  const [shipmentsLoading,setShipmentsLoading] = useState(false);
  const [shipmentsError,setShipmentsError] = useState("");
  const [creatingShipment,setCreatingShipment] = useState<string|null>(null);
  const loadShipments = useCallback(async () => {
    setShipmentsLoading(true);setShipmentsError("");
    try { const response = await apiRequest<{data:ShipmentRow[]}>("/moderator/yandex-shipments");setShipments(response.data); }
    catch(e) {setShipmentsError(e instanceof Error ? e.message : "Не удалось загрузить отправления");}
    finally {setShipmentsLoading(false);}
  },[]);
  const createShipment = async (order:string) => {
    if (!window.confirm(`Создать тестовое отправление Яндекс Доставки по заказу ${order}?`)) return;
    setCreatingShipment(order);setShipmentsError("");
    try {await apiRequest(`/moderator/yandex-shipments/${encodeURIComponent(order)}/create`,{method:"POST",body:"{}"});await loadShipments();}
    catch(e) {setShipmentsError(e instanceof Error ? e.message : "Ошибка создания заявки");await loadShipments();}
    finally {setCreatingShipment(null);}
  };
  type ReturnRow = { orderNumber: string; trackingNumber: string; requestId: string; reason: string | null; status: string; startedAt: string | null; completedAt: string | null; cost: number | null; costCurrency: string | null };
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsError, setReturnsError] = useState("");
  const [returnsPartial, setReturnsPartial] = useState(false);
  const [returnQuery, setReturnQuery] = useState("");
  const [returnStatus, setReturnStatus] = useState("active");
  const [returnPeriod, setReturnPeriod] = useState("all");
  const loadReturns = useCallback(async () => {
    setReturnsLoading(true); setReturnsError("");
    try {
      const result = await apiRequest<{data:ReturnRow[];meta?:{partial:boolean}}>("/moderator/yandex-returns");
      setReturns(result.data); setReturnsPartial(Boolean(result.meta?.partial));
    } catch (e) { setReturnsError(e instanceof Error ? e.message : "Не удалось получить возвраты"); }
    finally { setReturnsLoading(false); }
  }, []);
  const formatReturnDate = (v:string|null) => v ? new Date(v).toLocaleDateString("ru-RU") : "—";
  const visibleReturns = returns.filter(r => {
    const q = returnQuery.trim().toLowerCase();
    if (q && !`${r.orderNumber} ${r.trackingNumber}`.toLowerCase().includes(q)) return false;
    if (returnStatus === "active" && r.completedAt) return false;
    if (returnStatus === "completed" && !r.completedAt) return false;
    if (returnPeriod !== "all") {
      const days = Number(returnPeriod);
      if (!r.startedAt || new Date(r.startedAt).getTime() < Date.now() - days * 86400000) return false;
    }
    return true;
  });
  const [items, setItems] = useState<Package[]>([]);
  // Диагностические проверки API отключены в рабочем интерфейсе.
  const [pointKind, setPointKind] = useState<"dropoff"|"destination">("dropoff");
  const [points, setPoints] = useState<YandexPoint[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState("");
  const [pointsTotal, setPointsTotal] = useState<number|null>(null);
  const [selectedPoint, setSelectedPoint] = useState("");
  const [primaryDropoff, setPrimaryDropoff] = useState<YandexPoint | null>(null);
  const [primaryBusy, setPrimaryBusy] = useState(false);
  const [primaryError, setPrimaryError] = useState("");
  const [primaryNotice, setPrimaryNotice] = useState("");
  const loadPrimary = useCallback(async () => {
    try {
      const result = await apiRequest<{data:YandexPoint|null}>("/moderator/yandex-delivery-test/primary-dropoff");
      setPrimaryDropoff(result.data);
    } catch (e) { setPrimaryError(e instanceof Error ? e.message : "Не удалось загрузить основной ПВЗ"); }
  }, []);
  const savePrimary = async (point:YandexPoint) => {
    setPrimaryBusy(true); setPrimaryError(""); setPrimaryNotice("");
    try {
      const result = await apiRequest<{data:YandexPoint}>("/moderator/yandex-delivery-test/primary-dropoff", {
        method:"PUT", body:JSON.stringify({id:point.id,name:point.name,address:point.address,city:point.city})
      });
      setPrimaryDropoff(result.data); setPrimaryNotice("Основной ПВЗ сохранён в базе данных");
    } catch (e) { setPrimaryError(e instanceof Error ? e.message : "Не удалось сохранить ПВЗ"); }
    finally { setPrimaryBusy(false); }
  };
  const clearPrimary = async () => {
    setPrimaryBusy(true); setPrimaryError(""); setPrimaryNotice("");
    try {
      await apiRequest("/moderator/yandex-delivery-test/primary-dropoff", {method:"DELETE"});
      setPrimaryDropoff(null); setPrimaryNotice("Основной ПВЗ сброшен");
    } catch (e) { setPrimaryError(e instanceof Error ? e.message : "Не удалось сбросить ПВЗ"); }
    finally { setPrimaryBusy(false); }
  };
  const loadPoints = async (kind: "dropoff"|"destination") => {
    setPointKind(kind); setPointsLoading(true); setPointsError(""); setPoints([]); setPointsTotal(null); setSelectedPoint("");
    try {
      const result = await apiRequest<{data:{ok:boolean;points?:YandexPoint[];total?:number;message?:string}}>(`/moderator/yandex-delivery-test/points?kind=${kind}`);
      if (!result.data.ok) throw new Error(result.data.message || "Яндекс не вернул список пунктов");
      setPoints(result.data.points || []); setPointsTotal(result.data.total ?? 0);
    } catch(e) { setPointsError(e instanceof Error ? e.message : "Ошибка получения пунктов"); }
    finally { setPointsLoading(false); }
  };
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [showForm, setShowForm] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiRequest<{data: Package[]}>("/moderator/shipping-packages"); setItems(response.data); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить упаковки"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (section === "packaging") void load(); }, [section, load]);
  useEffect(() => {if (section === "shipments") void loadShipments();},[section,loadShipments]);
  useEffect(() => { if (section === "returns") void loadReturns(); }, [section,loadReturns]);
  useEffect(() => { if (section === "dropoff-points") void loadPrimary(); }, [section, loadPrimary]);
  useEffect(() => { if (section === "dropoff-points" && pointsTotal === null && !pointsLoading) void loadPoints("dropoff");
    // Fetch on first opening; explicit refresh remains available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);
  if (!sections.some((s) => s.key === section)) return <Navigate to="/admin/delivery/shipments" replace />;
  const current = sections.find(s => s.key === section)!;
  const change = (key: keyof Form, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setMessage("");
    try {
      if (!/^[A-ZА-ЯЁ0-9_-]{1,32}$/u.test(form.code.trim().toUpperCase())) throw new Error("Укажите обозначение коробки (например, S или XXL)");
      const sort = Number(form.sort_order);
      if (!Number.isInteger(sort)) throw new Error("Порядок должен быть целым числом");
      const data = { code: form.code.trim().toUpperCase(), inner_length_cm: positive(form.inner_length_cm, true), inner_width_cm: positive(form.inner_width_cm, true),
        inner_height_cm: positive(form.inner_height_cm, true), tare_weight_g: positive(form.tare_weight_g, true),
        is_active: form.is_active, sort_order: sort };
      setBusy(true);
      await apiRequest(`/moderator/shipping-packages${editing ? `/${editing}` : ""}`, { method: editing ? "PUT" : "POST", body: JSON.stringify(data) });
      setMessage(editing ? "Упаковка обновлена" : "Упаковка добавлена"); setShowForm(false); setEditing(null); setForm(blank); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить упаковку"); }
    finally { setBusy(false); }
  };
  const toggleStatus = async (p: Package) => {
    setError(""); setMessage("");
    if (!p.tare_weight_g || Number(p.tare_weight_g) <= 0) {
      setError(`Укажите вес коробки «${p.code}» перед активацией. Для этого нажмите «Изменить».`);
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/moderator/shipping-packages/${p.id}/status`, {
        method: "PATCH", body: JSON.stringify({ is_active: !p.is_active })
      });
      setMessage(`Упаковка «${p.code}» ${p.is_active ? "отключена" : "активирована"}`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить статус"); }
    finally { setBusy(false); }
  };
  const remove = async (p: Package) => {
    if (!window.confirm(`Удалить упаковку «${p.code}»?`)) return;
    setError(""); setMessage(""); setBusy(true);
    try { await apiRequest(`/moderator/shipping-packages/${p.id}`, { method: "DELETE" }); setMessage("Упаковка удалена"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось удалить упаковку"); }
    finally { setBusy(false); }
  };
  return <div className="admin-delivery-page">
    <div className="admin-editor-section-heading"><div><h1>Доставка</h1><p>Управление отправлениями и транспортной упаковкой.</p></div></div>
    <nav className="admin-delivery-tabs" aria-label="Разделы доставки">{sections.map(s => <NavLink key={s.key} to={`/admin/delivery/${s.key}`} className={({isActive}) => isActive ? "active" : ""}>{s.label}</NavLink>)}</nav>
    <section className="admin-editor-card admin-editor-card-wide">
      <div className="admin-editor-section-heading"><div><h2>{current.label}</h2>{section === "packaging" && <p>Габариты коробок в сантиметрах. Вес коробки обязателен. Без указанного веса упаковку нельзя активировать.</p>}</div>
        {section === "packaging" && !showForm && <button type="button" className="admin-primary-button" onClick={() => {setEditing(null); setForm(blank); setShowForm(true); setError("");}}>Добавить упаковку</button>}
      </div>
      {section === "returns" ? <div>
        <div className="admin-delivery-actions admin-returns-filters">
          <input aria-label="Поиск возврата" placeholder="Номер заказа или трек-номер" value={returnQuery} onChange={e => setReturnQuery(e.target.value)} />
          <select aria-label="Статус возврата" value={returnStatus} onChange={e => setReturnStatus(e.target.value)}><option value="active">Незавершённые</option><option value="completed">Завершённые</option><option value="all">Все возвраты</option></select>
          <select aria-label="Период возврата" value={returnPeriod} onChange={e => setReturnPeriod(e.target.value)}><option value="all">Всё время</option><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select>
          <button type="button" className="admin-secondary-button" disabled={returnsLoading} onClick={() => void loadReturns()}>{returnsLoading ? "Обновляем…" : "Обновить"}</button>
        </div>
        {returnsError && <p className="admin-editor-message is-error" role="alert">{returnsError}</p>}
        {returnsPartial && <p className="admin-editor-message is-error" role="status">Не удалось получить сведения по части отправлений. Список может быть неполным.</p>}
        <div className="admin-delivery-table-wrap"><table className="admin-delivery-table"><thead><tr><th>Заказ</th><th>Трек-номер</th><th>Причина</th><th>Статус Яндекса</th><th>Начало</th><th>Завершение</th><th>Расходы</th></tr></thead><tbody>
          {visibleReturns.map(r => <tr key={r.requestId}><td><NavLink to={`/admin/orders/${encodeURIComponent(r.orderNumber)}`}>{r.orderNumber}</NavLink></td><td>{r.trackingNumber}</td><td>{r.reason ?? "Не указана"}</td><td>{r.status}</td><td>{formatReturnDate(r.startedAt)}</td><td>{formatReturnDate(r.completedAt)}</td><td>{r.cost === null ? "Нет данных" : `${r.cost.toLocaleString("ru-RU")} ${r.costCurrency ?? ""}`}</td></tr>)}
          {!visibleReturns.length && <tr><td colSpan={7}>{returnsLoading ? "Загружаем возвраты…" : "Возвраты по выбранным условиям не найдены"}</td></tr>}
        </tbody></table></div>
        <p className="admin-returns-note">Сведения поступают из Яндекс Доставки. Отсутствующие причины, даты и расходы не подменяются расчётными значениями. Возврат денег через ЮKassa автоматически не выполняется.</p>
      </div> : section === "shipments" ? <div>
        <div className="admin-delivery-actions"><button type="button" className="admin-secondary-button" disabled={shipmentsLoading} onClick={() => void loadShipments()}>{shipmentsLoading ? "Загрузка…" : "Обновить список"}</button></div>
        <p>После подтверждения оплаты система автоматически создаёт заявку в тестовом API Яндекса. При ошибке проверьте причину и повторите создание вручную. Не повторяйте заявки со статусом «Требует проверки».</p>
        {shipmentsError && <p className="admin-editor-message is-error" role="alert">{shipmentsError}</p>}
        <div className="admin-delivery-table-wrap"><table className="admin-delivery-table"><thead><tr><th>Заказ</th><th>Получатель</th><th>ПВЗ назначения</th><th>Оплата</th><th>Статус заявки</th><th>ID Яндекса</th><th>Действие</th></tr></thead><tbody>
        {shipments.map(sh => <tr key={sh.order_number}>
          <td><strong>{sh.order_number}</strong></td><td>{sh.recipient_name ?? "—"}</td><td>{sh.full_address?.replace(/^\[ПВЗ Яндекс [^\]]+\]\s*/, "") ?? "—"}</td>
          <td>{sh.payment_status === "paid" ? "Оплачен" : sh.payment_status}</td>
          <td>{sh.shipment_status === "submitted" ? "Заявка создана" : sh.shipment_status === "rejected" ? `Отклонено (${sh.error_code ?? "ошибка"})` : sh.shipment_status === "uncertain" ? "Требует проверки" : sh.shipment_status === "creating" ? "Создаётся" : sh.payment_status === "paid" ? "Ожидает создания / требуется проверка" : "Ожидает оплаты"}</td>
          <td>{sh.yandex_request_id ?? "—"}</td>
          <td>{sh.payment_status === "paid" && sh.order_status !== "cancelled" && (!sh.shipment_status || sh.shipment_status === "rejected") ? <button type="button" className="admin-primary-button" disabled={creatingShipment !== null} onClick={() => void createShipment(sh.order_number)}>{creatingShipment === sh.order_number ? "Создаём…" : sh.shipment_status === "rejected" ? "Повторить создание" : "Создать вручную"}</button> : "—"}</td>
        </tr>)}
        {!shipments.length && <tr><td colSpan={7}>{shipmentsLoading ? "Загрузка…" : "Заказы Яндекс Доставки не найдены"}</td></tr>}
        </tbody></table></div>
      </div> : section === "dropoff-points" ? <div className="admin-pvz-layout">
        <div className="admin-pvz-heading"><div><h3>Пункт самостоятельной отгрузки</h3><p>Выберите пункт, принимающий посылки от продавцов. Забор курьером не используется.</p></div><span className="admin-pvz-mode">Тестовый режим · Москва</span></div>
        <div className="admin-pvz-primary"><div><strong>Основной пункт отгрузки</strong>{primaryDropoff ? <p>{primaryDropoff.name} · {primaryDropoff.address}</p> : <p>Пока не выбран</p>}</div>{primaryDropoff && <button type="button" className="admin-secondary-button" disabled={primaryBusy} onClick={() => void clearPrimary()}>Сбросить</button>}</div>
        <div className="admin-pvz-map-heading"><div><h3>Выбор пункта на карте</h3><p>{pointsTotal === null ? "Загружаем доступные пункты…" : `Доступно пунктов: ${pointsTotal}`}</p></div><button type="button" className="admin-secondary-button" disabled={pointsLoading} onClick={() => void loadPoints("dropoff")}>{pointsLoading ? "Обновляем…" : "Обновить ПВЗ"}</button></div>
        {pointsError && <p className="admin-editor-message is-error" role="alert">{pointsError}</p>}
        {pointsTotal !== null && pointKind === "dropoff" && <YandexPickupMap points={points} selectedId={selectedPoint} onSelect={p => setSelectedPoint(p.id)} title="Поиск ПВЗ по адресу или названию" />}
        {(() => { const chosen = pointKind === "dropoff" ? points.find(p => p.id === selectedPoint) : undefined; return chosen ? <div className="admin-pvz-choice"><div><strong>{chosen.name}</strong><p>{chosen.address}</p></div><button type="button" className="admin-primary-button" disabled={primaryBusy} onClick={() => void savePrimary(chosen)}>Сохранить основной ПВЗ</button></div> : null; })()}
        {primaryError && <p className="admin-editor-message is-error" role="alert">{primaryError}</p>}
        {primaryNotice && <p className="admin-editor-message is-success" role="status">{primaryNotice}</p>}
        <p className="admin-pvz-note">Основной ПВЗ сохраняется в PostgreSQL. Отправления создаются вручную в разделе «Отправления» через тестовый API Яндекса.</p>
        {/* Диагностика API и пробный расчёт тарифа отключены в рабочем интерфейсе. */}
      </div> : section !== "packaging" ? <p className="admin-delivery-empty">Раздел находится в разработке.</p> : <>
        {error && <p className="admin-editor-message is-error" role="alert">{error}</p>}
        {message && <p className="admin-editor-message is-success">{message}</p>}
        {showForm && <form onSubmit={e => void submit(e)} className="admin-delivery-form">
          <h3>{editing ? "Редактирование упаковки" : "Новая упаковка"}</h3>
          <div className="admin-delivery-grid">
            {([['code','Обозначение *'], ['inner_length_cm','Длина, см *'], ['inner_width_cm','Ширина, см *'], ['inner_height_cm','Высота, см *'], ['tare_weight_g','Вес коробки, г *'], ['sort_order','Порядок']] as const).map(([key,label]) => <label key={key} className="admin-field"><span>{label}</span><input value={form[key]} onChange={e => change(key, e.target.value)} required={key === 'code' || key.startsWith('inner_') || key === 'tare_weight_g'} inputMode={key === 'code' ? 'text' : 'decimal'} /></label>)}
            <label className="admin-delivery-check"><input type="checkbox" checked={form.is_active} onChange={e => change('is_active', e.target.checked)} /> Активна</label>
          </div>
          <div className="admin-delivery-actions"><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? "Сохранение…" : "Сохранить"}</button><button type="button" className="admin-secondary-button" disabled={busy} onClick={() => {setShowForm(false);setEditing(null);setForm(blank);}}>Отмена</button></div>
        </form>}
        {loading ? <p>Загрузка…</p> : <div className="admin-delivery-table-wrap"><table className="admin-delivery-table"><thead><tr><th>Размер</th><th>Габариты</th><th>Объём</th><th>Вес коробки</th><th>Статус</th><th>Действия</th></tr></thead><tbody>
          {items.map(p => <tr key={p.id}><td><strong>{p.code}</strong></td><td>{Number(p.inner_length_cm)} × {Number(p.inner_width_cm)} × {Number(p.inner_height_cm)} см</td><td>{(Number(p.inner_length_cm)*Number(p.inner_width_cm)*Number(p.inner_height_cm)/1000).toFixed(2)} л</td><td>{p.tare_weight_g == null ? "Не указан" : `${Number(p.tare_weight_g)} г`}</td><td><label className="admin-delivery-check"><input type="checkbox" checked={p.is_active} disabled={busy} onChange={() => void toggleStatus(p)} aria-label={`Активность упаковки ${p.code}`} /> {p.is_active ? "Активна" : "Отключена"}</label></td><td><div className="admin-delivery-actions"><button className="admin-secondary-button" disabled={busy} onClick={() => {setEditing(p.id);setForm(toForm(p));setShowForm(true);setError("");}}>Изменить</button><button className="admin-secondary-button" disabled={busy} onClick={() => void remove(p)}>Удалить</button></div></td></tr>)}
          {!items.length && <tr><td colSpan={6}>Упаковки ещё не добавлены.</td></tr>}
        </tbody></table></div>}
      </>}
    </section>
  </div>;
}
