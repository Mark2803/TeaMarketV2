import { ChevronLeft, ChevronRight, PackageOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { getAdminProducts } from "../../shared/api/admin";
import type {
  AdminProductListItem,
  AdminProductVariantStatus,
} from "../../shared/api/admin";

const PAGE_SIZE = 20;

function imageOf(product: AdminProductListItem) {
  return product.product_images?.[0]?.url ?? product.product_images?.[0]?.image_url ?? null;
}

function stockOf(product: AdminProductListItem) {
  return product.product_variants.reduce(
    (sum, variant) => sum + (Number(variant.stock_quantity) || 0),
    0,
  );
}

function priceOf(product: AdminProductListItem) {
  const prices = product.product_variants
    .map((variant) => Number(variant.price))
    .filter(Number.isFinite);

  if (!prices.length) return "—";

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return min === max
    ? `${formatPrice(min)} ₽`
    : `${formatPrice(min)}–${formatPrice(max)} ₽`;
}

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"all" | "active" | "inactive">("all");
  const [status, setStatus] = useState<"" | AdminProductVariantStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(active === "active"
        ? { isActive: true }
        : active === "inactive"
          ? { isActive: false }
          : {}),
      ...(status ? { variantStatus: status } : {}),
    }),
    [page, search, active, status],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getAdminProducts(query)
      .then((response) => {
        if (cancelled) return;
        setProducts(response.data);
        setTotal(response.pagination.total);
        setPages(Math.max(1, response.pagination.totalPages));
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
        setError("Не удалось загрузить товары.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(input.trim());
  };

  const resetFilters = () => {
    setInput("");
    setSearch("");
    setActive("all");
    setStatus("");
    setPage(1);
  };

  return (
    <section className="admin-products-page">
      <div className="admin-page-heading admin-products-heading">
        <div>
          <h1>Товары</h1>
          <p>Управление товарами магазина, ценами, вариантами и остатками.</p>
        </div>

        <button
          className="admin-primary-button"
          type="button"
          onClick={() => navigate("/admin/products/new")}
        >
          + Добавить товар
        </button>
      </div>

      <div className="admin-products-toolbar">
        <form className="admin-products-search" onSubmit={submitSearch}>
          <Search size={18} />
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Название, slug или SKU"
          />
          <button type="submit">Найти</button>
        </form>

        <div className="admin-products-filters">
          <label>
            <span>Товар</span>
            <select
              value={active}
              onChange={(event) => {
                setActive(event.target.value as typeof active);
                setPage(1);
              }}
            >
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
          </label>

          <label>
            <span>Варианты</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPage(1);
              }}
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="hidden">Скрытые</option>
              <option value="archived">Архивные</option>
            </select>
          </label>

          <button className="admin-secondary-button" type="button" onClick={resetFilters}>
            Сбросить
          </button>
        </div>
      </div>

      <div className="admin-products-summary">
        <strong>{total}</strong>
        <span>товаров найдено</span>
      </div>

      <div className="admin-products-table-card">
        {loading ? (
          <div className="admin-products-state">Загрузка товаров…</div>
        ) : error ? (
          <div className="admin-products-state admin-products-error">{error}</div>
        ) : !products.length ? (
          <div className="admin-products-state">
            <PackageOpen size={30} />
            <strong>Товары не найдены</strong>
            <span>Измените поиск или фильтры.</span>
          </div>
        ) : (
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Варианты</th>
                  <th>Цена</th>
                  <th>Остаток</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const image = imageOf(product);
                  return (
                    <tr
                      key={product.id}
                      className="admin-product-row-clickable"
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                    >
                      <td>
                        <div className="admin-product-cell">
                          <div className="admin-product-thumb">
                            {image ? <img src={image} alt="" /> : <PackageOpen size={20} />}
                          </div>
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.slug}</span>
                            {product.is_new ? <em>Новинка</em> : null}
                          </div>
                        </div>
                      </td>
                      <td>{product.product_variants.length} шт.</td>
                      <td>{priceOf(product)}</td>
                      <td><strong>{stockOf(product)}</strong></td>
                      <td>
                        <span className={`admin-status-badge ${product.is_active ? "is-active" : "is-inactive"}`}>
                          {product.is_active ? "Активен" : "Неактивен"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && pages > 1 ? (
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
