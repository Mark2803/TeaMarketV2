import {
  ChevronRight,
  Coffee,
  Flower2,
  Gift,
  Leaf,
  Sparkles
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import {
  useCategories
} from "../shared/hooks/useCatalog";

const fallbackIcons = [
  Coffee,
  Leaf,
  Sparkles,
  Flower2,
  Gift
];

const accentClasses = [
  "catalog-category-item__image--brown",
  "catalog-category-item__image--olive",
  "catalog-category-item__image--green",
  "catalog-category-item__image--red",
  "catalog-category-item__image--light"
];

export default function CatalogPage() {
  const categoriesQuery = useCategories();

  const categories =
    categoriesQuery.data?.data ?? [];

  return (
    <div className="catalog-page">
      <header className="catalog-page__heading">
        <p>Выберите направление</p>
        <h1>Каталог</h1>
      </header>

      {categoriesQuery.isLoading && (
        <div className="catalog-state">
          Загрузка категорий…
        </div>
      )}

      {categoriesQuery.isError && (
        <div className="catalog-state catalog-state--error">
          {categoriesQuery.error.message}
        </div>
      )}

      {!categoriesQuery.isLoading
        && !categoriesQuery.isError
        && categories.length === 0 && (
          <div className="catalog-state">
            В каталоге пока нет категорий.
          </div>
        )}

      <div className="catalog-category-list">
        {categories.map((category, index) => {
          const Icon =
            fallbackIcons[index % fallbackIcons.length];
          const accent =
            accentClasses[index % accentClasses.length];

          return (
            <Link
              key={category.id}
              to={`/catalog/${category.slug}`}
              className="catalog-category-item"
            >
              <span
                className={`catalog-category-item__image ${accent}`}
              >
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt=""
                  />
                ) : (
                  <Icon
                    size={22}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                )}
              </span>

              <span className="catalog-category-item__content">
                <strong>{category.name}</strong>
                <small>
                  {category.product_count} товаров
                </small>
              </span>

              <ChevronRight
                size={19}
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
