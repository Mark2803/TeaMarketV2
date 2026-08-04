import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { mapProductToCategoryCard } from "../features/category/category.mapper";
import CategoryProductCard from "../features/category/components/CategoryProductCard";
import { useCategories } from "../shared/hooks/useCatalog";
import { useSearchProducts } from "../shared/hooks/useSearchProducts";

import "../shared/styles/search.css";

const SEARCH_HISTORY_KEY = "tea-market-search-history";

function readSearchHistory(): string[] {
  try {
    const value = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6)
      : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: string[]): void {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 6)));
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.get("q")?.trim() ?? "");
  const [searchHistory, setSearchHistory] = useState<string[]>(readSearchHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = useCategories();
  const searchQuery = useSearchProducts(submittedQuery);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = query.trim();
      setSubmittedQuery(normalized);
      setSearchParams(normalized ? { q: normalized } : {}, { replace: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, setSearchParams]);

  const results = useMemo(
    () => (searchQuery.data?.data ?? []).map(mapProductToCategoryCard),
    [searchQuery.data]
  );

  const hasQuery = submittedQuery.length > 0;
  const queryIsTooShort = submittedQuery.length === 1;
  const categories = categoriesQuery.data?.data ?? [];

  const rememberQuery = (value: string) => {
    const normalized = value.trim();
    if (normalized.length < 2) return;

    setSearchHistory((current) => {
      const next = [
        normalized,
        ...current.filter((item) => item.toLocaleLowerCase("ru-RU") !== normalized.toLocaleLowerCase("ru-RU"))
      ].slice(0, 6);
      saveSearchHistory(next);
      return next;
    });
  };

  const submitSearch = (value: string) => {
    const normalized = value.trim();
    setQuery(normalized);
    setSubmittedQuery(normalized);
    if (normalized.length >= 2) rememberQuery(normalized);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    saveSearchHistory([]);
  };

  return (
    <div className="search-page">
      <form
        className="search-page__form"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch(query);
        }}
      >
        <Search size={23} strokeWidth={1.7} aria-hidden="true" />

        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Поиск чая, вкуса, эффекта..."
          aria-label="Поиск товаров"
          onChange={(event) => setQuery(event.target.value)}
          onBlur={() => {
            if (query.trim().length >= 2) rememberQuery(query);
          }}
        />

        {query && (
          <button
            type="button"
            className="search-page__clear"
            aria-label="Очистить поиск"
            onClick={() => {
              setQuery("");
              setSubmittedQuery("");
            }}
          >
            <X size={21} aria-hidden="true" />
          </button>
        )}
      </form>

      {!hasQuery && (
        <div className="search-discovery">
          <section className="search-discovery__section">
            <div className="search-discovery__heading">
              <h1>Категории</h1>
            </div>

            {categoriesQuery.isLoading && <p>Загрузка категорий…</p>}
            {categoriesQuery.isError && <p>{categoriesQuery.error.message}</p>}

            <div className="search-discovery__categories">
              {categories.map((category) => (
                <Link key={category.id} to={`/catalog/${category.slug}`}>
                  {category.name}
                  <small>{category.product_count} товаров</small>
                </Link>
              ))}
            </div>
          </section>

          {searchHistory.length > 0 && (
            <section className="search-discovery__section">
              <div className="search-discovery__heading">
                <h2>Недавние запросы</h2>
                <button type="button" onClick={clearHistory}>Очистить</button>
              </div>

              <div className="search-discovery__history">
                {searchHistory.map((item) => (
                  <button key={item} type="button" onClick={() => submitSearch(item)}>
                    <Search size={17} aria-hidden="true" />
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {queryIsTooShort && (
        <section className="search-empty">
          <h1>Введите ещё один символ</h1>
          <p>Поиск начинается с двух символов.</p>
        </section>
      )}

      {submittedQuery.length >= 2 && searchQuery.isLoading && (
        <section className="search-empty">
          <span className="search-empty__icon"><Search size={34} aria-hidden="true" /></span>
          <h1>Ищем товары…</h1>
        </section>
      )}

      {submittedQuery.length >= 2 && searchQuery.isError && (
        <section className="search-empty">
          <h1>Не удалось выполнить поиск</h1>
          <p>{searchQuery.error.message}</p>
        </section>
      )}

      {submittedQuery.length >= 2 && !searchQuery.isLoading && !searchQuery.isError && results.length > 0 && (
        <section className="search-results">
          <div className="search-results__header">
            <div>
              <span>Результаты поиска</span>
              <h1>«{submittedQuery}»</h1>
            </div>
            <strong>{results.length}</strong>
          </div>

          <div className="search-results__grid">
            {results.map((product) => (
              <CategoryProductCard key={product.id ?? product.slug} product={product} />
            ))}
          </div>
        </section>
      )}

      {submittedQuery.length >= 2 && !searchQuery.isLoading && !searchQuery.isError && results.length === 0 && (
        <section className="search-empty">
          <span className="search-empty__icon"><Search size={34} strokeWidth={1.6} aria-hidden="true" /></span>
          <h1>Ничего не найдено</h1>
          <p>Попробуйте изменить запрос, убрать часть слов или перейти в Каталог.</p>
          <Link to="/catalog" className="search-empty__catalog">Перейти в каталог</Link>
        </section>
      )}
    </div>
  );
}
