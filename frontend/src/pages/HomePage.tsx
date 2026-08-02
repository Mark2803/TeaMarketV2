import {
  ArrowRight,
  BookOpen,
  Clock3,
  Coffee,
  Flower2,
  Gift,
  Heart,
  Leaf,
  Mountain,
  PackageOpen,
  Search,
  Sparkles,
  Zap
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import heroImage from "../assets/hero.png";

import {
  useProducts
} from "../shared/hooks/useProducts";

const heroSlides = [
  {
    eyebrow: "Китайский чай",
    title: "Натуральный чай для каждого момента",
    text: "Чистый вкус природы и душевное равновесие",
    linkLabel: "Перейти в каталог",
    linkTo: "/catalog"
  },
  {
    eyebrow: "Новые поступления",
    title: "Откройте чай, который подходит именно вам",
    text: "Улуны, пуэры и зелёные чаи из проверенных регионов",
    linkLabel: "Смотреть новинки",
    linkTo: "/catalog"
  },
  {
    eyebrow: "Подарочные наборы",
    title: "Чайный подарок с настроением",
    text: "Готовые наборы для близких, друзей и коллег",
    linkLabel: "Выбрать подарок",
    linkTo: "/catalog"
  }
];

const collections = [
  {
    title: "Новинки",
    icon: Sparkles
  },
  {
    title: "Хиты продаж",
    icon: Heart
  },
  {
    title: "Для расслабления",
    icon: Flower2
  },
  {
    title: "Для бодрости",
    icon: Zap
  },
  {
    title: "Подарочные наборы",
    icon: Gift
  }
];

const categories = [
  { name: "Улуны", slug: "oolong", icon: Leaf },
  { name: "Пуэры", slug: "shu-puer", icon: Coffee },
  { name: "Зелёный чай", slug: "green-tea", icon: Flower2 },
  { name: "Красный чай", slug: "red-tea", icon: Sparkles },
  { name: "Белый чай", slug: "white-tea", icon: Leaf },
  { name: "Жёлтый чай", slug: "yellow-tea", icon: Flower2 },
  { name: "Матча", slug: "matcha", icon: Coffee },
  { name: "Травяной", slug: "herbal-tea", icon: Flower2 }
];

const fallbackProducts = [
  {
    id: "demo-gaba",
    slug: "gaba-alishan",
    name: "Габа Алишань",
    subtitle: "50 г · Тайвань",
    price: "535",
    imageUrl: null
  },
  {
    id: "demo-mango",
    slug: "oolong-mango",
    name: "Улун с манго",
    subtitle: "50 г · Китай",
    price: "135",
    imageUrl: null
  },
  {
    id: "demo-jasmine",
    slug: "moli-hua-cha",
    name: "Моли Хуа Ча",
    subtitle: "100 г · Китай",
    price: "205",
    imageUrl: null
  },
  {
    id: "demo-longjing",
    slug: "longjing",
    name: "Лунцзин",
    subtitle: "100 г · Китай",
    price: "360",
    imageUrl: null
  }
];

const articles = [
  {
    title: "Как правильно заваривать улун",
    readingTime: "5 мин чтения",
    icon: Coffee
  },
  {
    title: "Польза зелёного чая для организма",
    readingTime: "4 мин чтения",
    icon: Leaf
  },
  {
    title: "История чая в Китае",
    readingTime: "6 мин чтения",
    icon: BookOpen
  }
];

export default function HomePage() {
  const [activeHeroSlide, setActiveHeroSlide] =
    useState(0);

  const productsQuery =
    useProducts({
      page: 1,
      limit: 8,
      sort: "newest"
    });

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setActiveHeroSlide(
          (currentSlide) =>
            (currentSlide + 1)
            % heroSlides.length
        );
      }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const products = useMemo(() => {
    const apiProducts =
      productsQuery.data?.data ?? [];

    if (apiProducts.length === 0) {
      return fallbackProducts;
    }

    return apiProducts.map(
      (product) => {
        const image =
          product.product_images[0];

        const availableVariants =
          product.product_variants.filter(
            (variant) =>
              variant.status === "active"
              && variant.is_available
          );

        const firstVariant =
          availableVariants[0]
          ?? product.product_variants[0];

        const subtitleParts = [
          firstVariant?.weight_g
            ? `${firstVariant.weight_g} г`
            : null,
          product.country
        ].filter(Boolean);

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          subtitle:
            subtitleParts.join(" · ")
            || product.short_description
            || "Китайский чай",
          price: firstVariant?.price ?? "—",
          imageUrl: image?.image_url ?? null
        };
      }
    );
  }, [productsQuery.data]);

  const heroSlide =
    heroSlides[activeHeroSlide];

  return (
    <div className="home-page">
      <Link
        to="/search"
        className="home-search"
        aria-label="Открыть поиск"
      >
        <Search
          size={18}
          strokeWidth={1.7}
          aria-hidden="true"
        />

        <span>
          Поиск чая, вкуса, эффекта...
        </span>

        <ArrowRight
          size={18}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </Link>

      <section
        className="home-hero"
        aria-label="Главные предложения"
      >
        <img
          src={heroImage}
          alt=""
          className="home-hero__image"
        />

        <div className="home-hero__content">
          <p className="home-hero__eyebrow">
            {heroSlide.eyebrow}
          </p>

          <h1 className="home-hero__title">
            {heroSlide.title}
          </h1>

          <p className="home-hero__text">
            {heroSlide.text}
          </p>

          <Link
            to={heroSlide.linkTo}
            className="home-hero__link"
          >
            {heroSlide.linkLabel}
          </Link>
        </div>

        <div
          className="home-carousel-dots"
          aria-label="Переключение баннеров"
        >
          {heroSlides.map(
            (slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={
                  index === activeHeroSlide
                    ? "home-carousel-dot home-carousel-dot--active"
                    : "home-carousel-dot"
                }
                aria-label={`Показать баннер ${index + 1}`}
                aria-pressed={
                  index === activeHeroSlide
                }
                onClick={() => {
                  setActiveHeroSlide(index);
                }}
              />
            )
          )}
        </div>
      </section>

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Подборки
          </h2>

          <Link to="/catalog">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="home-horizontal-scroll home-collections">
          {collections.map(
            ({
              title,
              icon: Icon
            }) => (
              <Link
                key={title}
                to="/catalog"
                className="home-collection-card"
              >
                <Icon
                  size={27}
                  strokeWidth={1.45}
                  aria-hidden="true"
                />

                <span>
                  {title}
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Категории
          </h2>

          <Link to="/catalog">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="home-horizontal-scroll home-categories">
          {categories.map(
            ({
              name,
              slug,
              icon: Icon
            }) => (
              <Link
                key={slug}
                to={`/catalog/${slug}`}
                className="home-category"
              >
                <span className="home-category__icon">
                  <Icon
                    size={22}
                    strokeWidth={1.45}
                    aria-hidden="true"
                  />
                </span>

                <span>
                  {name}
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Новинки
          </h2>

          <Link to="/catalog">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="home-horizontal-scroll home-products">
          {products.map(
            (product) => (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                className="home-product-card"
                aria-label={`Открыть товар ${product.name}`}
              >
                <div className="home-product-card__image">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                    />
                  ) : (
                    <Leaf
                      size={42}
                      strokeWidth={1.05}
                      aria-hidden="true"
                    />
                  )}

                  <span
                    className="home-product-card__favorite"
                    aria-hidden="true"
                  >
                    <Heart
                      size={17}
                      strokeWidth={1.55}
                    />
                  </span>
                </div>

                <h3>
                  {product.name}
                </h3>

                <p>
                  {product.subtitle}
                </p>

                <strong>
                  от {product.price} ₽
                </strong>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Для вас
          </h2>

          <Link to="/catalog">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="home-horizontal-scroll home-promo-grid">
          <Link
            to="/catalog"
            className="home-promo-card home-promo-card--mountains"
          >
            <Mountain
              size={28}
              strokeWidth={1.35}
              aria-hidden="true"
            />

            <span>
              Высокогорные чаи
            </span>

            <small>
              Чистота горного воздуха в каждой чашке
            </small>
          </Link>

          <Link
            to="/catalog"
            className="home-promo-card home-promo-card--gifts"
          >
            <PackageOpen
              size={28}
              strokeWidth={1.35}
              aria-hidden="true"
            />

            <span>
              Подарочные наборы
            </span>

            <small>
              Красивые наборы для особых случаев
            </small>
          </Link>
        </div>
      </section>

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Статьи о чае
          </h2>

          <Link to="/">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="home-horizontal-scroll home-articles">
          {articles.map(
            ({
              title,
              readingTime,
              icon: Icon
            }) => (
              <article
                key={title}
                className="home-article-card"
              >
                <div className="home-article-card__image">
                  <Icon
                    size={28}
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                </div>

                <div className="home-article-card__content">
                  <h3>
                    {title}
                  </h3>

                  <span>
                    <Clock3
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />

                    {readingTime}
                  </span>
                </div>
              </article>
            )
          )}
        </div>
      </section>
    </div>
  );
}
