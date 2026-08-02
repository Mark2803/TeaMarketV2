import {
  useMemo,
  useState
} from "react";

import {
  useParams
} from "react-router-dom";

import BrewingGuide from "../features/product/components/BrewingGuide";
import ProductDescription from "../features/product/components/ProductDescription";
import ProductGallery from "../features/product/components/ProductGallery";
import ProductInfo from "../features/product/components/ProductInfo";
import ProductPurchase from "../features/product/components/ProductPurchase";
import ProductRecommendations from "../features/product/components/ProductRecommendations";
import ProductSpecs from "../features/product/components/ProductSpecs";
import ProductToolbar from "../features/product/components/ProductToolbar";
import ProductVariants from "../features/product/components/ProductVariants";
import StockNotification from "../features/product/components/StockNotification";

import {
  categoryCatalog
} from "../features/category/category.data";

import {
  productDemo
} from "../features/product/product.data";

function getNumericPrice(
  value: string
): number {
  const parsed =
    Number(
      value.replace(/[^0-9]/g, "")
    );

  return Number.isFinite(parsed)
    ? parsed
    : productDemo.variants[1].price;
}

export default function ProductPage() {
  const {
    slug = productDemo.slug
  } = useParams<{
    slug: string;
  }>();

  const product = useMemo(() => {
    const categoryEntry =
      Object.entries(categoryCatalog)
        .map(([categorySlug, category]) => ({
          categorySlug,
          category,
          item: category.products.find(
            (candidate) => candidate.slug === slug
          )
        }))
        .find((entry) => entry.item);

    if (!categoryEntry?.item) {
      return productDemo;
    }

    const basePrice =
      getNumericPrice(categoryEntry.item.price);

    return {
      ...productDemo,
      slug,
      name: categoryEntry.item.name,
      subtitle: categoryEntry.item.details,
      article:
        slug
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .slice(0, 16),
      teaType: categoryEntry.category.name,
      variants: productDemo.variants.map(
        (variant, index) => ({
          ...variant,
          price:
            Math.round(
              basePrice
              * [0.62, 1, 1.82, 3.55][index]
            ),
          oldPrice:
            index === 1
              ? Math.round(basePrice * 1.28)
              : null
        })
      )
    };
  }, [slug]);

  const [activeImage, setActiveImage] =
    useState(0);

  const [selectedVariantId, setSelectedVariantId] =
    useState("50");

  const [quantity, setQuantity] =
    useState(1);

  const [favorite, setFavorite] =
    useState(false);

  const selectedVariant = useMemo(
    () =>
      product.variants.find(
        (variant) => variant.id === selectedVariantId
      )
      ?? product.variants[0],
    [product, selectedVariantId]
  );

  return (
    <div
      className="product-page"
      data-product-slug={slug}
    >
      <ProductToolbar
        favorite={favorite}
        onToggleFavorite={() =>
          setFavorite((value) => !value)
        }
      />

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
            article={product.article}
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
            onDecrease={() =>
              setQuantity(
                (value) => Math.max(1, value - 1)
              )
            }
            onIncrease={() =>
              setQuantity((value) => value + 1)
            }
            onToggleFavorite={() =>
              setFavorite((value) => !value)
            }
          />

          <ProductSpecs product={product} />
        </div>

        <div className="product-page__secondary">
          <ProductDescription />
          <BrewingGuide />
          <StockNotification />
          <ProductRecommendations />
        </div>
      </div>
    </div>
  );
}
