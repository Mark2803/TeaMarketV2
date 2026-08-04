import {
  ImageOff
} from "lucide-react";

import {
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import type {
  ProductRecommendation
} from "../product.types";

type ProductRecommendationsProps = {
  similarProducts: ProductRecommendation[];
  relatedProducts: ProductRecommendation[];
};

export default function ProductRecommendations({
  similarProducts,
  relatedProducts
}: ProductRecommendationsProps) {
  const [activeTab, setActiveTab] =
    useState<"similar" | "related">(
      similarProducts.length > 0
        ? "similar"
        : "related"
    );

  const products =
    activeTab === "similar"
      ? similarProducts
      : relatedProducts;

  if (
    similarProducts.length === 0
    && relatedProducts.length === 0
  ) {
    return null;
  }

  return (
    <section className="product-detail-section product-recommendations">
      <h2>
        Рекомендации
      </h2>

      <div className="product-recommendations__tabs">
        {similarProducts.length > 0 && (
          <button
            type="button"
            className={
              activeTab === "similar"
                ? "product-recommendations__tab--active"
                : ""
            }
            onClick={() =>
              setActiveTab("similar")
            }
          >
            Похожие товары
          </button>
        )}

        {relatedProducts.length > 0 && (
          <button
            type="button"
            className={
              activeTab === "related"
                ? "product-recommendations__tab--active"
                : ""
            }
            onClick={() =>
              setActiveTab("related")
            }
          >
            Связанные товары
          </button>
        )}
      </div>

      <div className="product-recommendations__list">
        {products.map(
          (product) => (
            <article
              key={product.slug}
              className="recommendation-card"
            >
              <Link
                to={`/products/${product.slug}`}
                className="recommendation-card__image"
                aria-label={`Открыть товар ${product.name}`}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={
                      product.imageAlt
                      || product.name
                    }
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="recommendation-card__image-placeholder"
                    aria-hidden="true"
                  >
                    <ImageOff
                      size={32}
                      strokeWidth={1.5}
                    />
                  </span>
                )}
              </Link>

              <h3>
                <Link
                  to={`/products/${product.slug}`}
                >
                  {product.name}
                </Link>
              </h3>

              <div className="recommendation-card__footer">
                <strong>
                  {product.price.toLocaleString(
                    "ru-RU"
                  )}
                  {" ₽"}
                </strong>

                <Link
                  to={`/products/${product.slug}`}
                  className="recommendation-card__open"
                >
                  Выбрать вес
                </Link>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}