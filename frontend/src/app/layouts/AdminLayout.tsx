import {
  BarChart3,
  Bell,
  Boxes,
  Gauge,
  LogOut,
  Megaphone,
  PackageOpen,
  Settings,
  ShoppingBag,
  Tags,
  Users,
  FileText,
} from "lucide-react";
import { NavLink, Navigate, Outlet } from "react-router-dom";

import { useAdminAuth } from "../../features/admin/AdminAuthProvider";

const items = [
  ["/admin", "Главная панель", Gauge],
  ["/admin/products", "Товары", ShoppingBag],
  ["/admin/categories", "Каталог", Tags],
  ["/admin/stock", "Остатки", Boxes],
  ["/admin/orders", "Заказы", PackageOpen],
  ["/admin/customers", "Покупатели", Users],
  ["/admin/promotions", "Акции", Megaphone],
  ["/admin/content", "Контент", FileText],
  ["/admin/notifications", "Уведомления", Bell],
  ["/admin/analytics", "Аналитика", BarChart3],
  ["/admin/settings", "Настройки", Settings],
] as const;

export default function AdminLayout() {
  const { username, loading, logout } = useAdminAuth();

  if (loading) {
    return <div className="admin-loading">Проверка доступа…</div>;
  }

  if (!username) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-row">
            <img className="admin-brand-logo" src="/brand-logo.svg" alt="" />
            <strong>Чайный Мастер</strong>
          </div>
          <span>Панель управления</span>
        </div>

        <nav className="admin-nav">
          {items.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          className="admin-logout"
          type="button"
          onClick={() => void logout()}
        >
          <LogOut size={18} />
          Выйти
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>Администратор</strong>
            <span>{username}</span>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}