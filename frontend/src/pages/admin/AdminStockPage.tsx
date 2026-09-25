import { ChevronLeft, ChevronRight, ExternalLink, PackageX, Search, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAdminStock,
  updateAdminVariantStock,
} from "../../shared/api/admin";
import type {
  AdminStockItem,
  AdminStockStatus,
} from "../../shared/api/admin";

const PAGE_SIZE = 20;

function formatPrice(value: string | number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number)} ₽`;
}

function stockClass(quantity: number) {
  if (quantity <= 0) return "is-out";
  if (quantity <= 5) return "is-low";
  return "is-ok";
}

function statusLabel(status: AdminStockItem["status"]) {
  if (status === "active") return "Активен";
  if (status === "hidden") return "Скрыт";
  return "Архив";
}

export default function AdminStockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminStockItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<AdminStockStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      stockStatus,
      ...(search ? { search } : {}),
    }),
    [page, search, stockStatus],
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminStock(query);
      setItems(response.data);
      setTotal(response.pagination.total);
      setPages(Math.max(1, response.pagination.totalPages));
      setDrafts(
        Object.fromEntries(
          response.data.map((item) => [item.variantId, String(item.stockQuantity)]),
        ),
      );
    } catch {
      setItems([]);
      setError("Не удалось загрузить остатки.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // load depends only on the memoized query for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(input.trim());
  };

  const resetFilters = () => {
    setInput("");
    setSearch("");
    setStockStatus("all");
    setPage(1);
  };

  const saveStock = async (item: AdminStockItem) => {
    const raw = drafts[item.variantId] ?? "";
    const quantity = Number(raw);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Остаток должен быть целым числом от 0.");
      return;
    }

    setSavingId(item.variantId);
    setError("");
    setMessage("");

    try {
      await updateAdminVariantStock(item.productId, item.variantId, quantity);
      setMessage(`Остаток для ${item.sku} сохранён.`);
      await load();
    } catch {
      setError(`Не удалось сохранить остаток для ${item.sku}.`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="admin-stock-page">
      <div className="admin-page-heading admin-stock-heading">
        <div>
          <h1>Остатки</h1>
          <p>Управление фактическим количеством товара по каждому SKU.</p>
        </div>
      </div>

      <div className="admin-stock-toolbar">
        <form className="admin-products-search" onSubmit={submitSearch}>
          <Search size={18} />
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Название товара, slug или SKU"
          />
          <button type="submit">Найти</button>
        </form>

        <div className="admin-products-filters">
          <label>
            <span>Остаток</span>
            <select
              value={stockStatus}
              onChange={(event) => {
                setStockStatus(event.target.value as AdminStockStatus);
                setPage(1);
              }}
            >
              <option value="all">Все</option>
              <option value="low">Мало (1–5)</option>
              <option value="out">Нет в наличии</option>
            </select>
          </label>

          <button className="admin-secondary-button" type="button" onClick={resetFilters}>
            Сбросить
          </button>
        </div>
      </div>

      {message ? <div className="admin-editor-message is-success">{message}</div> : null}
      {error ? <div className="admin-editor-message is-error">{error}</div> : null}

      <div className="admin-products-summary">
        <strong>{total}</strong>
        <span>SKU найдено</span>
      </div>

      <div className="admin-stock-table-card">
        {loading ? (
          <div className="admin-products-state">Загрузка остатков…</div>
        ) : !items.length ? (
          <div className="admin-products-state">
            <PackageX size={30} />
            <strong>Варианты не найдены</strong>
            <span>Измените поиск или фильтр остатков.</span>
          </div>
        ) : (
          <div className="admin-stock-table-wrap">
            <table className="admin-stock-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>SKU</th>
                  <th>Вес</th>
                  <th>Цена</th>
                  <th>Остаток</th>
                  <th>Доступность</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const changed = drafts[item.variantId] !== String(item.stockQuantity);
                  return (
                    <tr key={item.variantId}>
                      <td data-label="Товар">
                        <button
                          className="admin-stock-product-link"
                          type="button"
                          onClick={() => navigate(`/admin/products/${item.productId}`)}
                        >
                          <strong>{item.productName}</strong>
                          <span>{item.productSlug}</span>
                        </button>
                      </td>
                      <td data-label="SKU"><strong>{item.sku}</strong></td>
                      <td data-label="Вес">{item.weightG} г</td>
                      <td data-label="Цена">{formatPrice(item.price)}</td>
                      <td data-label="Остаток">
                        <div className="admin-stock-editor">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={drafts[item.variantId] ?? String(item.stockQuantity)}
                            onChange={(event) => {
                              setDrafts((current) => ({
                                ...current,
                                [item.variantId]: event.target.value,
                              }));
                              setError("");
                              setMessage("");
                            }}
                            aria-label={`Остаток ${item.sku}`}
                          />
                          <span className={`admin-stock-level ${stockClass(item.stockQuantity)}`}>
                            {item.stockQuantity <= 0 ? "Нет" : item.stockQuantity <= 5 ? "Мало" : "В наличии"}
                          </span>
                        </div>
                      </td>
                      <td data-label="Доступность">
                        <span className={`admin-status-badge ${item.isAvailable ? "is-active" : "is-inactive"}`}>
                          {item.isAvailable ? "Да" : "Нет"}
                        </span>
                      </td>
                      <td data-label="Статус">
                        <span className={`admin-status-badge ${item.status === "active" ? "is-active" : "is-inactive"}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="admin-stock-actions">
                        <button
                          className="admin-stock-save"
                          type="button"
                          disabled={!changed || savingId === item.variantId}
                          onClick={() => void saveStock(item)}
                          title="Сохранить остаток"
                        >
                          <Save size={17} />
                          <span>{savingId === item.variantId ? "Сохранение…" : "Сохранить"}</span>
                        </button>
                        <button
                          className="admin-stock-open"
                          type="button"
                          onClick={() => navigate(`/admin/products/${item.productId}`)}
                          title="Открыть товар"
                        >
                          <ExternalLink size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && pages > 1 ? (
        <div className="admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft size={18} /> Назад
          </button>
          <span>Страница <strong>{page}</strong> из <strong>{pages}</strong></span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>
            Вперёд <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
