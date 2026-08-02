import {
  ChevronRight,
  Coffee,
  Flower2,
  Gift,
  Leaf,
  Search,
  ShoppingCart,
  Sparkles
} from "lucide-react";

import {
  Link
} from "react-router-dom";

type CatalogCategory = {
  slug: string;
  name: string;
  productCount: number;
  icon: typeof Leaf;
  accent: string;
};

const catalogCategories: CatalogCategory[] = [
  {
    slug: "shu-puer",
    name: "Шу Пуэр",
    productCount: 128,
    icon: Coffee,
    accent: "catalog-category-item__image--brown"
  },
  {
    slug: "sheng-puer",
    name: "Шен Пуэр",
    productCount: 96,
    icon: Leaf,
    accent: "catalog-category-item__image--olive"
  },
  {
    slug: "oolong",
    name: "Улуны",
    productCount: 84,
    icon: Leaf,
    accent: "catalog-category-item__image--green"
  },
  {
    slug: "red-tea",
    name: "Красный чай",
    productCount: 112,
    icon: Sparkles,
    accent: "catalog-category-item__image--red"
  },
  {
    slug: "green-tea",
    name: "Зелёный чай",
    productCount: 92,
    icon: Leaf,
    accent: "catalog-category-item__image--fresh"
  },
  {
    slug: "white-tea",
    name: "Белый чай",
    productCount: 68,
    icon: Flower2,
    accent: "catalog-category-item__image--light"
  },
  {
    slug: "yellow-tea",
    name: "Жёлтый чай",
    productCount: 24,
    icon: Flower2,
    accent: "catalog-category-item__image--yellow"
  },
  {
    slug: "matcha",
    name: "Матча",
    productCount: 46,
    icon: Coffee,
    accent: "catalog-category-item__image--matcha"
  },
  {
    slug: "herbal-tea",
    name: "Травяной чай",
    productCount: 73,
    icon: Flower2,
    accent: "catalog-category-item__image--herbal"
  },
  {
    slug: "tea-paste",
    name: "Чайные смолы",
    productCount: 28,
    icon: Sparkles,
    accent: "catalog-category-item__image--dark"
  },
  {
    slug: "tea-sets",
    name: "Чайные наборы",
    productCount: 36,
    icon: Gift,
    accent: "catalog-category-item__image--gift"
  },
  {
    slug: "tea-ware",
    name: "Посуда",
    productCount: 52,
    icon: Coffee,
    accent: "catalog-category-item__image--ware"
  }
];

export default function CatalogPage() {
  return (
    <div className="catalog-page">
      <header className="catalog-toolbar">
        <div>
          <p className="catalog-toolbar__eyebrow">
            Выберите направление
          </p>

          <h1>
            Каталог
          </h1>
        </div>

        <Link
          to="/cart"
          className="catalog-toolbar__cart"
          aria-label="Открыть корзину"
        >
          <ShoppingCart
            size={24}
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span>
            2
          </span>
        </Link>
      </header>

      <Link
        to="/search"
        className="catalog-search"
      >
        <Search
          size={19}
          strokeWidth={1.7}
          aria-hidden="true"
        />

        <span>
          Поиск чая...
        </span>
      </Link>

      <div className="catalog-category-list">
        {catalogCategories.map(
          ({
            slug,
            name,
            productCount,
            icon: Icon,
            accent
          }) => (
            <Link
              key={slug}
              to={`/catalog/${slug}`}
              className="catalog-category-item"
            >
              <span
                className={`catalog-category-item__image ${accent}`}
              >
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>

              <span className="catalog-category-item__content">
                <strong>
                  {name}
                </strong>

                <small>
                  {productCount} товаров
                </small>
              </span>

              <ChevronRight
                size={19}
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
