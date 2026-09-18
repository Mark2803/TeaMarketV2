import "../shared/styles/home-favorites.css";
import "../shared/styles/home-db-only.css";
import "../shared/styles/home-hero-carousel.css";

import {
  ArrowRight,
  BookOpen,
  Coffee,
  Flower2,
  Heart,
  Leaf,
  Sparkles
} from "lucide-react";

import {
  useMemo
} from "react";

import HomeHeroCarousel from "../features/home/components/HomeHeroCarousel";

import {
  Link
} from "react-router-dom";

import {
  useFavorites
} from "../features/favorites/useFavorites";

import {
  useCategories,
  useCollections
} from "../shared/hooks/useCatalog";

import {
  useProducts
} from "../shared/hooks/useProducts";

import {
  useArticles
} from "../shared/hooks/useArticles";

import { useHomeBanners } from "../shared/hooks/useHomeBanners";

export default function HomePage() {
  const articlesQuery =
    useArticles(true);

  const homeBannersQuery =
    useHomeBanners();

  const {
    isFavorite,
    toggle: toggleFavoriteProduct,
    isMutating: isFavoriteMutating
  } = useFavorites();

  const productsQuery =
    useProducts({
      page: 1,
      limit: 8,
      sort: "newest",
      isNew: true,
      rotation: "daily"
    });

  const categoriesQuery =
    useCategories();

  const collectionsQuery =
    useCollections();

  const products = useMemo(() => {
    const apiProducts =
      productsQuery.data?.data ?? [];

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
            || "Описание не указано",
          price:
            firstVariant?.price
            ?? null,
          imageUrl:
            image?.image_url
            ?? null
        };
      }
    );
  }, [productsQuery.data]);

  const homeCategories =
    categoriesQuery.data?.data
      .slice(0, 8)
    ?? [];

  const homeCollections =
    (collectionsQuery.data?.data ?? [])
      .filter(
        (collection) =>
          collection.show_on_home
      )
      .slice(0, 8);

  const hasCatalogError =
    Boolean(productsQuery.error)
    || Boolean(categoriesQuery.error)
    || Boolean(collectionsQuery.error);

  return (
    <div className="home-page">
      {homeBannersQuery.isLoading ? (
        <div className="home-data-state">Загружаем плашки…</div>
      ) : (homeBannersQuery.data?.data.length ?? 0) > 0 ? (
        <HomeHeroCarousel banners={homeBannersQuery.data?.data ?? []} />
      ) : (
        <header className="home-db-heading">
          <p>Каталог Tea Market</p>
          <h1>Китайский чай из реальной базы данных</h1>
          <span>Hero-плашки пока не добавлены в базу данных.</span>
        </header>
      )}

      {hasCatalogError && (
        <section className="home-data-state home-data-state--error">
          <h2>
            Не удалось загрузить данные магазина
          </h2>

          <p>
            Проверьте, что backend и PostgreSQL запущены, затем обновите страницу.
          </p>
        </section>
      )}

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Подборки
          </h2>

          <Link to="/collections">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        {collectionsQuery.isLoading ? (
          <div className="home-data-state">
            Загружаем подборки…
          </div>
        ) : homeCollections.length > 0 ? (
          <div className="home-horizontal-scroll home-collections">
            {homeCollections.map(
              (collection, index) => {
                const collectionIcons = [
                  Sparkles,
                  Heart,
                  Flower2,
                  Leaf
                ];

                const Icon =
                  collectionIcons[
                    index
                    % collectionIcons.length
                  ];

                return (
                  <Link
                    key={collection.id}
                    to={`/collections/${collection.slug}`}
                    className="home-collection-card"
                  >
                    <Icon
                      size={27}
                      strokeWidth={1.45}
                      aria-hidden="true"
                    />

                    <span>
                      {collection.name}
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        ) : (
          <div className="home-data-state">
            Активных подборок для Главной пока нет.
          </div>
        )}
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

        {categoriesQuery.isLoading ? (
          <div className="home-data-state">
            Загружаем категории…
          </div>
        ) : homeCategories.length > 0 ? (
          <div className="home-horizontal-scroll home-categories">
            {homeCategories.map(
              (category, index) => {
                const categoryIcons = [
                  Leaf,
                  Coffee,
                  Flower2,
                  Sparkles
                ];

                const Icon =
                  categoryIcons[
                    index
                    % categoryIcons.length
                  ];

                return (
                  <Link
                    key={category.id}
                    to={`/catalog/${category.slug}`}
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
                      {category.name}
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        ) : (
          <div className="home-data-state">
            Категории в базе данных пока отсутствуют.
          </div>
        )}
      </section>

      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Новинки
          </h2>

          <Link to="/new">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        {productsQuery.isLoading ? (
          <div className="home-data-state">
            Загружаем товары…
          </div>
        ) : products.length > 0 ? (
          <div className="home-horizontal-scroll home-products">
            {products.map(
              (product) => {
                const favorite =
                  isFavorite(product.id);

                return (
                  <article
                    key={product.id}
                    className="home-product-card"
                  >
                    <Link
                      to={`/products/${product.slug}`}
                      className="home-product-card__link"
                      aria-label={`Открыть товар ${product.name}`}
                    />

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

                      <button
                        type="button"
                        className={
                          favorite
                            ? "home-product-card__favorite home-product-card__favorite--active"
                            : "home-product-card__favorite"
                        }
                        aria-label={
                          favorite
                            ? `Удалить ${product.name} из избранного`
                            : `Добавить ${product.name} в избранное`
                        }
                        aria-pressed={favorite}
                        disabled={
                          isFavoriteMutating
                        }
                        onClick={() => {
                          void toggleFavoriteProduct(
                            product.id
                          );
                        }}
                      >
                        <Heart
                          size={17}
                          strokeWidth={1.55}
                          fill={
                            favorite
                              ? "currentColor"
                              : "none"
                          }
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {product.subtitle}
                    </p>

                    <strong>
                      {product.price
                        ? `от ${product.price} ₽`
                        : "Цена не указана"}
                    </strong>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="home-data-state">
            Активных товаров с доступными вариантами пока нет.
          </div>
        )}
      </section>


      <section className="home-content-section">
        <div className="home-section-heading">
          <h2>
            Статьи о чае
          </h2>

          <Link to="/articles">
            Смотреть все
            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        {articlesQuery.isLoading ? (
          <div className="home-data-state">
            Загружаем статьи…
          </div>
        ) : articlesQuery.isError ? (
          <div className="home-data-state home-data-state--error">
            Не удалось загрузить статьи.
          </div>
        ) : (articlesQuery.data?.data.length ?? 0) > 0 ? (
          <div className="home-articles">
            {articlesQuery.data?.data.map(
              (article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  className="home-article-card"
                >
                  <span className="home-article-card__media">
                    {article.cover_url ? (
                      <img
                        src={article.cover_url}
                        alt={article.cover_alt ?? article.title}
                      />
                    ) : (
                      <BookOpen
                        size={30}
                        strokeWidth={1.35}
                        aria-hidden="true"
                      />
                    )}
                  </span>

                  <span className="home-article-card__body">
                    <h3>
                      {article.title}
                    </h3>

                    <span>
                      {article.reading_time_minutes} мин чтения
                    </span>
                  </span>
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="home-data-state">
            Опубликованных статей пока нет.
          </div>
        )}
      </section>

    </div>
  );
}
