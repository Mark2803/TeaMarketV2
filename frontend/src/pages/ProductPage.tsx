import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useParams
} from "react-router-dom";

import BrewingGuide from "../features/product/components/BrewingGuide";
import ProductDescription from "../features/product/components/ProductDescription";
import ProductGallery from "../features/product/components/ProductGallery";
import ProductInfo from "../features/product/components/ProductInfo";
import ProductPurchase from "../features/product/components/ProductPurchase";
import ProductRecommendations from "../features/product/components/ProductRecommendations";
import ProductSpecs from "../features/product/components/ProductSpecs";
import ProductVariants from "../features/product/components/ProductVariants";
import StockNotification from "../features/product/components/StockNotification";

import {
  mapProductDetailsToView
} from "../features/product/product.mapper";

import {
  useFavorites
} from "../features/favorites/useFavorites";

import {
  useCart
} from "../features/cart/useCart";

import {
  useProduct
} from "../shared/hooks/useProduct";

import type {
  ProductView
} from "../features/product/product.types";

type ProductPageContentProps = {
  product: ProductView;
};

function ProductPageContent({
  product
}: ProductPageContentProps) {
  const initialVariant =
    product.variants.find(
      (variant) =>
        variant.status !== "unavailable"
    )
    ?? product.variants[0];

  const [activeImage, setActiveImage] =
    useState(0);

  const [selectedVariantId, setSelectedVariantId] =
    useState(initialVariant?.id ?? "");

  const [quantity, setQuantity] =
    useState(1);

  const {
    isFavorite,
    toggle: toggleFavoriteProduct,
    isMutating: isFavoriteMutating
  } = useFavorites();

  const favorite =
    isFavorite(product.id);

  const [message, setMessage] =
    useState<string | null>(null);

  const {
    addItem,
    isMutating: isAddingToCart
  } = useCart();

  useEffect(() => {
    document.title =
      product.seoTitle;

    return () => {
      document.title = "Tea Market";
    };
  }, [product.seoTitle]);

  const selectedVariant = useMemo(
    () =>
      product.variants.find(
        (variant) =>
          variant.id === selectedVariantId
      )
      ?? product.variants[0],
    [product.variants, selectedVariantId]
  );

  const toggleFavorite = () => {
    if (isFavoriteMutating) {
      return;
    }

    void toggleFavoriteProduct(
      product.id
    );
  };

  const shareProduct = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.subtitle,
          url: window.location.href
        });
        return;
      }

      await navigator.clipboard.writeText(
        window.location.href
      );

      setMessage("Ссылка скопирована");
    }
    catch {
      setMessage(
        "Не удалось поделиться ссылкой"
      );
    }
  };

  const addToCart = async () => {
    if (!selectedVariant) {
      return;
    }

    setMessage(null);

    try {
      await addItem(
        selectedVariant.id,
        quantity
      );

      setMessage(
        "Товар добавлен в корзину"
      );
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось добавить товар"
      );
    }
  };

  if (!selectedVariant) {
    return (
      <section className="product-page-state">
        <h1>
          У товара нет доступных вариантов
        </h1>

        <p>
          В backend не найдено ни одного активного варианта товара.
        </p>

        <Link to="/catalog">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  return (
    <div
      className="product-page"
      data-product-slug={product.slug}
    >
      <div className="product-page__columns">
        <div className="product-page__primary">
          <ProductGallery
            images={product.images}
            activeIndex={activeImage}
            onChange={setActiveImage}
          />

          <ProductInfo
            name={product.name}
            subtitle={product.subtitle}
            rating={product.rating}
            reviews={product.reviews}
            price={selectedVariant.price}
            oldPrice={selectedVariant.oldPrice}
            article={selectedVariant.sku}
            available={
              selectedVariant.status
              !== "unavailable"
            }
          />

          <ProductVariants
            variants={product.variants}
            selectedId={selectedVariantId}
            onSelect={setSelectedVariantId}
          />

          <ProductPurchase
            quantity={quantity}
            favorite={favorite}
            disabled={
              selectedVariant.status
              === "unavailable"
            }
            isAdding={isAddingToCart}
            message={message}
            onDecrease={() =>
              setQuantity((value) =>
                Math.max(1, value - 1)
              )
            }
            onIncrease={() =>
              setQuantity((value) =>
                Math.min(
                  Math.max(
                    selectedVariant.stock,
                    1
                  ),
                  value + 1
                )
              )
            }
            onToggleFavorite={toggleFavorite}
            onAddToCart={() => {
              void addToCart();
            }}
            onShare={shareProduct}
          />

          <ProductSpecs product={product} />
        </div>

        <div className="product-page__secondary">
          <ProductDescription
            aboutTea={product.aboutTea}
            taste={product.taste}
            aroma={product.aroma}
            effect={product.effect}
            beneficialProperties={product.beneficialProperties}
          />

          <BrewingGuide
            waterTemperature={product.brewing.waterTemperature}
            teaAmount={product.brewing.teaAmount}
            brewingTime={product.brewing.brewingTime}
            infusionCount={product.brewing.infusionCount}
            tips={product.brewing.tips}
          />

          {product.variants.some(
            (variant) =>
              variant.status === "unavailable"
          ) && (
            <StockNotification />
          )}

          <ProductRecommendations
            similarProducts={product.similarProducts}
            relatedProducts={product.relatedProducts}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const {
    slug = ""
  } = useParams<{
    slug: string;
  }>();

  const {
    data,
    error,
    isPending,
    refetch
  } = useProduct(slug);

  const product = useMemo(
    () =>
      data
        ? mapProductDetailsToView(
            data.data
          )
        : null,
    [data]
  );

  if (isPending) {
    return (
      <section
        className="product-page-state"
        aria-busy="true"
        aria-label="Загрузка товара"
      >
        <div className="product-page-skeleton" />
        <div className="product-page-skeleton product-page-skeleton--short" />
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="product-page-state">
        <h1>
          Не удалось загрузить товар
        </h1>

        <p>
          {error instanceof Error
            ? error.message
            : "Backend не вернул данные товара."}
        </p>

        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
        >
          Повторить запрос
        </button>

        <Link to="/catalog">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  return (
    <ProductPageContent
      key={product.id}
      product={product}
    />
  );
}
