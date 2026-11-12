import FinanceChart from "../../features/admin/FinanceChart";
import { downloadFinanceReport } from "../../features/admin/financeReport";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest } from "../../shared/api/client";
import {
  getAdminAnalytics,
  getAdminOrders,
  getAdminProductCount,
  getAdminStock,
  type AdminAnalyticsData,
  type AdminOrderListItem,
} from "../../shared/api/admin";
import {
  loadDashboardWidgets,
  type DashboardWidgetId,
} from "../../features/admin/dashboard/dashboardWidgets";

type Data = {
  products: number | null;
  newOrders: number | null;
  lowStock: number | null;
  outOfStock: number | null;
  recentOrders: AdminOrderListItem[];
  todayAnalytics: AdminAnalyticsData | null;
  weekAnalytics: AdminAnalyticsData | null;
};

const money = (value: number) =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)} ₽`;

// Используем тот же формат периода, что и страница «Аналитика».
// Это важно: финансовые KPI Главной должны быть теми же агрегатами backend,
// а не пересчитываться во frontend по другой логике статусов/оплат.
const iso = (date: Date) => date.toISOString().slice(0, 10);

const status: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "Собирается",
  shipped: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

export default function AdminDashboardPage() {
  const [cfg, setCfg] = useState(loadDashboardWidgets);
  const [shipmentAlerts, setShipmentAlerts] = useState<Array<{order_number:string;shipment_status:string|null;error_code:string|null}>>([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [resolving, setResolving] = useState("");
  const loadShipmentAlerts = async () => {
    try {
      const result = await apiRequest<{data:Array<{order_number:string;shipment_status:string|null;error_code:string|null}>}>("/moderator/yandex-alerts");
      setShipmentAlerts(result.data);
      setAlertsError("");
    } catch {
      setAlertsError("Не удалось загрузить ошибки доставки.");
    }
  };
  useEffect(() => {
    void loadShipmentAlerts();
    const interval = window.setInterval(() => void loadShipmentAlerts(), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const resolveShipmentAlert = async (orderNumber: string, reason: string) => {
    setResolving(orderNumber);
    setAlertsError("");
    try {
      await apiRequest(`/moderator/yandex-alerts/${encodeURIComponent(orderNumber)}/resolve`, {
        method: "POST", body: JSON.stringify({ reason })
      });
      await loadShipmentAlerts();
    } catch (error) {
      setAlertsError(error instanceof Error ? error.message : "Не удалось закрыть ошибку.");
    } finally {
      setResolving("");
    }
  };
  const [data, setData] = useState<Data>({
    products: null,
    newOrders: null,
    lowStock: null,
    outOfStock: null,
    recentOrders: [],
    todayAnalytics: null,
    weekAnalytics: null,
  });

  useEffect(() => {
    const sync = () => setCfg(loadDashboardWidgets());
    window.addEventListener("dashboard-widgets-changed", sync);
    return () => window.removeEventListener("dashboard-widgets-changed", sync);
  }, []);

  useEffect(() => {
    let active = true;

    const today = new Date();
    const weekFrom = new Date(today);
    weekFrom.setDate(today.getDate() - 6);

    Promise.all([
      getAdminProductCount(),
      getAdminOrders({ page: 1, limit: 5, archive: "all" }),
      getAdminOrders({ page: 1, limit: 1, status: "new", archive: "all" }),
      getAdminStock({ page: 1, limit: 1, stockStatus: "low", lowStockThreshold: 5 }),
      getAdminStock({ page: 1, limit: 1, stockStatus: "out" }),
      getAdminAnalytics(iso(today), iso(today)),
      getAdminAnalytics(iso(weekFrom), iso(today)),
    ])
      .then(([products, orders, newOrders, lowStock, outOfStock, todayAnalytics, weekAnalytics]) => {
        if (!active) return;
        setData({
          products: products.pagination.total,
          newOrders: newOrders.pagination.total,
          lowStock: lowStock.pagination.total,
          outOfStock: outOfStock.pagination.total,
          recentOrders: orders.data,
          todayAnalytics: todayAnalytics.data,
          weekAnalytics: weekAnalytics.data,
        });
      })
      .catch(() => {
        // Отдельные значения остаются «—» при ошибке API: не подменяем реальные
        // данные нулями и не показываем потенциально неверный расчёт.
      });

    return () => {
      active = false;
    };
  }, []);

  const salesToday = data.todayAnalytics?.overview.revenue;
  const averageToday = data.todayAnalytics?.overview.averageCheck;
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [finance, setFinance] = useState<AdminAnalyticsData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState("");
  useEffect(() => {
    let active = true; const to = new Date(), from = new Date(); from.setDate(to.getDate() - period + 1);
    setFinanceLoading(true); setFinanceError("");
    getAdminAnalytics(iso(from), iso(to)).then(r => { if (active) setFinance(r.data); }).catch(() => { if (active) { setFinance(null); setFinanceError("Не удалось загрузить финансовые данные."); } }).finally(() => { if (active) setFinanceLoading(false); });
    return () => { active = false; };
  }, [period]);
  const week = finance?.dynamics ?? [];
  const enabled = cfg.filter((item) => item.enabled);

  const render = (id: DashboardWidgetId) => {
    switch (id) {
      case "sales_today":
        return (
          <Link to="/admin/analytics" className="admin-stat-card">
            <span>Продажи сегодня</span>
            <strong>{salesToday == null ? "—" : money(salesToday)}</strong>
          </Link>
        );
      case "new_orders":
        return (
          <Link to="/admin/orders" className="admin-stat-card">
            <span>Новые заказы</span>
            <strong>{data.newOrders ?? "—"}</strong>
          </Link>
        );
      case "average_order":
        return (
          <Link to="/admin/analytics" className="admin-stat-card">
            <span>Средний чек сегодня</span>
            <strong>{averageToday == null ? "—" : money(averageToday)}</strong>
          </Link>
        );
      case "low_stock":
        return (
          <Link to="/admin/stock" className="admin-stat-card">
            <span>Низкие остатки</span>
            <strong>{data.lowStock ?? "—"}</strong>
          </Link>
        );
      case "out_of_stock":
        return (
          <Link to="/admin/stock" className="admin-stat-card">
            <span>Нет в наличии</span>
            <strong>{data.outOfStock ?? "—"}</strong>
          </Link>
        );
      case "products":
        return (
          <Link to="/admin/products" className="admin-stat-card">
            <span>Товары</span>
            <strong>{data.products ?? "—"}</strong>
          </Link>
        );
      case "sales_week":
        return (
          <div className="admin-section-card admin-dashboard-wide">
            <div className="admin-dashboard-section-title finance-header">
              <div><h2>Выручка по дням</h2><p className="finance-subtitle">{finance ? `${finance.period.from} — ${finance.period.to}` : "Выберите период"} · Заказы без отменённых</p></div>
              <div className="finance-actions">
                <div className="finance-period" aria-label="Период отчёта">{([7, 14, 30] as const).map(p => <button key={p} type="button" className={period === p ? "is-active" : ""} onClick={() => setPeriod(p)}>{p} дней</button>)}</div>
                <button type="button" className="finance-download" disabled={!finance || financeLoading} onClick={() => finance && downloadFinanceReport(finance)}>Скачать Excel</button>
                <Link to="/admin/analytics">Подробнее</Link>
              </div>
            </div>
            <div className="finance-summary"><span style={{color:"#249b65"}}>Товары <strong>{finance ? money(finance.overview.revenue) : "—"}</strong></span><span style={{color:"#e99b36"}}>Доставка покупателя <strong>{finance ? money(finance.overview.deliveryRevenue) : "—"}</strong></span><span>Всего поступлений по заказам <strong>{finance ? money(finance.overview.revenue + finance.overview.deliveryRevenue) : "—"}</strong></span><span>Заказы <strong>{finance?.overview.orders ?? "—"}</strong></span><span>Средний чек <strong>{finance ? money(finance.overview.averageCheck) : "—"}</strong></span></div>
            {financeError && <p role="alert" className="admin-analytics-warning">{financeError}</p>}
            {financeLoading ? <p>Загрузка отчёта…</p> : <FinanceChart data={week} />}
          </div>
        );
      case "recent_orders":
        return (
          <div className="admin-section-card admin-dashboard-wide">
            <div className="admin-dashboard-section-title">
              <h2>Последние заказы</h2>
              <Link to="/admin/orders">Смотреть все</Link>
            </div>
            <div className="admin-recent-orders">
              {data.recentOrders.map((order) => (
                <Link
                  to={`/admin/orders/${encodeURIComponent(order.order_number)}`}
                  key={order.id}
                >
                  <strong>№ {order.order_number}</strong>
                  <span>{order.customer_name || "Гость"}</span>
                  <span>{money(Number(order.total_amount))}</span>
                  <em>{status[order.status] ?? order.status}</em>
                </Link>
              ))}
              {!data.recentOrders.length && <p>Заказов пока нет.</p>}
            </div>
          </div>
        );
    }
  };

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <h1>Главная</h1>
        </div>
      </div>



      <section className="admin-section-card admin-delivery-alerts">
        <button type="button" className="admin-delivery-alerts-toggle"
          aria-expanded={alertsExpanded} onClick={() => setAlertsExpanded(value => !value)}>
          <span className="admin-delivery-alerts-title">
            {shipmentAlerts.length > 0 && <span className="admin-delivery-alerts-dot" aria-label="Есть незакрытые ошибки" />}
            <strong>Ошибки</strong>
            {shipmentAlerts.length > 0 && <span className="admin-delivery-alerts-count">{shipmentAlerts.length}</span>}
          </span>
          {alertsExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        {alertsExpanded && <div className="admin-delivery-alerts-body">
          {alertsError && <p role="alert">{alertsError}</p>}
          {shipmentAlerts.length === 0 ? <p>Незакрытых ошибок доставки нет.</p> :
            <>
              <p>Оплаченные заказы с проблемами оформления Яндекс Доставки:</p>
              <ul>{shipmentAlerts.map(row => <li key={row.order_number} className="admin-delivery-alerts-item">
                <div><Link to={`/admin/orders/${encodeURIComponent(row.order_number)}`}>{row.order_number}</Link> — {row.shipment_status === "uncertain" ? "результат неизвестен, проверьте перед повторной отправкой" : row.shipment_status === "rejected" ? `заявка отклонена (${row.error_code ?? "ошибка"})` : "заявка не создана"}</div>
                <div className="admin-delivery-alerts-actions">
                  <button type="button" disabled={Boolean(resolving)}
                    onClick={() => void resolveShipmentAlert(row.order_number, "test_order")}>Тестовый заказ</button>
                  <button type="button" disabled={Boolean(resolving)}
                    onClick={() => void resolveShipmentAlert(row.order_number, "manual_delivery")}>Оформлено вручную</button>
                </div>
              </li>)}</ul>
              <Link to="/admin/delivery/shipments">Открыть отправления</Link>
            </>
          }
        </div>}
      </section>
      <div className="admin-dashboard-grid">
        {enabled.map((item) => (
          <div
            key={item.id}
            className={
              item.id === "sales_week" || item.id === "recent_orders"
                ? "admin-dashboard-span"
                : ""
            }
          >
            {render(item.id)}
          </div>
        ))}
      </div>

      {!enabled.length && (
        <div className="admin-section-card">
          <h2>Главная панель пуста</h2>
          <p>Выберите виджеты в разделе «Настройки».</p>
          <Link
            className="admin-primary-button admin-dashboard-settings-link"
            to="/admin/settings"
          >
            Настроить
          </Link>
        </div>
      )}
    </section>
  );
}
