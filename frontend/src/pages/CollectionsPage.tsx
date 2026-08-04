import {
  Flower2,
  Gift,
  Heart,
  Mountain,
  Sparkles,
  Zap
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import {
  useCollections
} from "../shared/hooks/useCatalog";

import "../shared/styles/collections.css";

const icons = [
  Sparkles,
  Heart,
  Flower2,
  Zap,
  Mountain,
  Gift
];

export default function CollectionsPage() {
  const collectionsQuery = useCollections();
  const collections =
    collectionsQuery.data?.data ?? [];

  return (
    <div className="collections-page">
      <header className="collections-page__heading">
        <p>Тематические витрины</p>
        <h1>Подборки</h1>
        <span>
          Товары, объединённые по назначению,
          популярности и формату.
        </span>
      </header>

      {collectionsQuery.isLoading && (
        <div className="catalog-state">
          Загрузка подборок…
        </div>
      )}

      {collectionsQuery.isError && (
        <div className="catalog-state catalog-state--error">
          {collectionsQuery.error.message}
        </div>
      )}

      {!collectionsQuery.isLoading
        && !collectionsQuery.isError
        && collections.length === 0 && (
          <div className="catalog-state">
            Активных подборок пока нет.
          </div>
        )}

      <div className="collections-list">
        {collections.map((collection, index) => {
          const Icon = icons[index % icons.length];

          return (
            <Link
              key={collection.id}
              to={`/collections/${collection.slug}`}
              className="collection-list-card"
            >
              <span>
                {collection.image_url ? (
                  <img
                    src={collection.image_url}
                    alt=""
                  />
                ) : (
                  <Icon
                    size={28}
                    strokeWidth={1.45}
                    aria-hidden="true"
                  />
                )}
              </span>

              <div>
                <h2>{collection.name}</h2>
                <p>
                  {collection.description
                    ?? `${collection.product_count} товаров`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
