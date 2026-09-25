import { useLocation } from "react-router-dom";

const names: Record<string, string> = {
  "/admin/products": "Товары", "/admin/stock": "Остатки", "/admin/categories": "Каталог",
  "/admin/collections": "Подборки", "/admin/home": "Главная магазина", "/admin/articles": "Статьи",
  "/admin/orders": "Заказы", "/admin/customers": "Клиенты", "/admin/content": "Информация", "/admin/settings": "Настройки"
};

export default function AdminPlaceholderPage() {
  const { pathname } = useLocation();
  const title = names[pathname] ?? "Раздел";
  return <section><div className="admin-page-heading"><div><h1>{title}</h1><p>Раздел будет подключён к существующей БД и backend на соответствующем этапе.</p></div></div></section>;
}
