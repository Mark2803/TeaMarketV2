import "../shared/styles/favorites.css";

import {
  Heart
} from "lucide-react";

import EmptyFavorites from "../features/favorites/components/EmptyFavorites";
import FavoriteProductCard from "../features/favorites/components/FavoriteProductCard";

import {
  useFavorites
} from "../features/favorites/useFavorites";

export default function FavoritesPage() {
  const {
    items,
    count,
    remove,
    isEmpty,
    isLoading,
    isError,
    error,
    isAuthenticated
  } = useFavorites();

  if (!isAuthenticated) {
    return (
      <div className="favorites-page">
        <header className="favorites-page__header">
          <div>
            <span className="favorites-page__eyebrow">
              Личная подборка
            </span>

            <h1>
              Избранное
            </h1>
          </div>
        </header>

        <EmptyFavorites requiresAuth />
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <header className="favorites-page__header">
        <div>
          <span className="favorites-page__eyebrow">
            Личная подборка
          </span>

          <h1>
            Избранное
          </h1>
        </div>

        <span className="favorites-page__count">
          <Heart
            size={18}
            fill="currentColor"
            aria-hidden="true"
          />

          {count}
        </span>
      </header>

      {isLoading ? (
        <section className="favorites-page__state">
          Загрузка избранного…
        </section>
      ) : isError ? (
        <section className="favorites-page__state favorites-page__state--error">
          {error instanceof Error
            ? error.message
            : "Не удалось загрузить избранное"}
        </section>
      ) : isEmpty ? (
        <EmptyFavorites />
      ) : (
        <div className="favorites-grid">
          {items.map(({ product }) => (
            <FavoriteProductCard
              key={product.id}
              product={product}
              onRemove={(productId) => {
                void remove(productId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
