import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const week = data.weekAnalytics?.dynamics ?? [];
  const max = Math.max(1, ...week.map((item) => item.revenue));
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
            <div className="admin-dashboard-section-title">
              <h2>Продажи за 7 дней</h2>
              <Link to="/admin/analytics">Аналитика</Link>
            </div>
            <div className="admin-mini-chart">
              {week.map((item) => (
                <div className="admin-mini-chart-col" key={item.date}>
                  <span>{item.revenue ? money(item.revenue) : "0"}</span>
                  <i style={{ height: `${Math.max(4, (item.revenue / max) * 100)}%` }} />
                  <small>{item.date.slice(5)}</small>
                </div>
              ))}
              {!week.length && <p>За период данных пока нет.</p>}
            </div>
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
          <p>Управление магазином «Чайный Мастер»</p>
        </div>
      </div>

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
