import { useEffect, useMemo, useState } from "react";
import { Edit3, FolderTree, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAdminCategories,
  type AdminCategoryListItem,
} from "../../shared/api/admin";

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminCategoryListItem[]>([]);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "visible" | "hidden">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminCategories({
        limit: 100,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(visibility === "visible" ? { isVisible: true } : {}),
        ...(visibility === "hidden" ? { isVisible: false } : {}),
      });
      setItems(response.data);
    } catch {
      setError("Не удалось загрузить категории.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [search, visibility]);

  const roots = useMemo(() => items.filter((x) => !x.parentCategoryId).length, [items]);

  return (
    <div className="admin-page admin-categories-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">Каталог</p>
          <h1>Категории</h1>
          <p>Структура каталога, видимость, изображения и SEO категорий.</p>
        </div>
        <button className="admin-primary-button" type="button" onClick={() => navigate("/admin/categories/new")}>
          <Plus size={18} /> Добавить категорию
        </button>
      </div>

      <div className="admin-toolbar admin-category-toolbar">
        <label className="admin-search-field">
          <Search size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Название или slug" />
        </label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
          <option value="all">Все категории</option>
          <option value="visible">Только видимые</option>
          <option value="hidden">Только скрытые</option>
        </select>
      </div>

      {error && <div className="admin-editor-message is-error">{error}</div>}

      <div className="admin-summary-line">
        <span>{loading ? "Загрузка…" : `${items.length} категорий`}</span>
        {!loading && <span>Корневых: {roots}</span>}
      </div>

      {!loading && items.length === 0 ? (
        <div className="admin-empty-state"><FolderTree size={32} /><strong>Категории не найдены</strong></div>
      ) : (
        <div className="admin-category-table-card">
          <div className="admin-category-table-wrap">
            <table className="admin-category-table">
              <thead><tr><th>Категория</th><th>Родитель</th><th>Товаров</th><th>Подкатегорий</th><th>Порядок</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Категория">
                      <div className="admin-category-name">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="admin-category-image-placeholder"><FolderTree size={18}/></div>}
                        <div><strong>{item.name}</strong><span>{item.slug}</span></div>
                      </div>
                    </td>
                    <td data-label="Родитель">{item.parentCategory?.name ?? "—"}</td>
                    <td data-label="Товаров">{item.productCount}</td>
                    <td data-label="Подкатегорий">{item.childCategoryCount}</td>
                    <td data-label="Порядок">{item.sortOrder}</td>
                    <td data-label="Статус"><span className={`admin-status-badge ${item.isVisible ? "is-active" : "is-inactive"}`}>{item.isVisible ? "Видимая" : "Скрытая"}</span></td>
                    <td className="admin-category-actions">
                      <button className="admin-secondary-button" type="button" onClick={() => navigate(`/admin/categories/${item.id}`)}><Edit3 size={16}/> Изменить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
