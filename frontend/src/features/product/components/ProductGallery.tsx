import {
  ChevronLeft,
  ChevronRight,
  Search,
  X
} from "lucide-react";

import {
  useEffect,
  useState
} from "react";

type ProductGalleryProps = {
  images: readonly {
    url: string;
    alt: string;
  }[];
  activeIndex: number;
  onChange: (index: number) => void;
};

export default function ProductGallery({
  images,
  activeIndex,
  onChange
}: ProductGalleryProps) {
  const [isZoomOpen, setIsZoomOpen] =
    useState(false);

  useEffect(() => {
    if (!isZoomOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setIsZoomOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isZoomOpen]);

  const activeImage =
    images[activeIndex]
    ?? images[0];

  const showPrevious = () => {
    onChange(
      activeIndex === 0
        ? images.length - 1
        : activeIndex - 1
    );
  };

  const showNext = () => {
    onChange(
      activeIndex === images.length - 1
        ? 0
        : activeIndex + 1
    );
  };

  if (!activeImage) {
    return null;
  }

  return (
    <section className="product-gallery">
      <div className="product-gallery__main">
        <img
          src={activeImage.url}
          alt={activeImage.alt}
        />

        <button
          type="button"
          className="product-gallery__zoom"
          aria-label="Увеличить изображение"
          onClick={() => setIsZoomOpen(true)}
        >
          <Search size={20} />
        </button>
      </div>

      {images.length > 1 && (
        <div className="product-gallery__thumbs">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              className={
                index === activeIndex
                  ? "product-gallery__thumb product-gallery__thumb--active"
                  : "product-gallery__thumb"
              }
              onClick={() => onChange(index)}
              aria-label={`Открыть изображение ${index + 1}`}
            >
              <img
                src={image.url}
                alt={image.alt}
              />
            </button>
          ))}
        </div>
      )}

      {isZoomOpen && (
        <div
          className="product-gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Увеличенное изображение товара"
          onMouseDown={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            className="product-gallery-modal__close"
            aria-label="Закрыть"
            onClick={() => setIsZoomOpen(false)}
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="product-gallery-modal__previous"
              aria-label="Предыдущее изображение"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={showPrevious}
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <img
            src={activeImage.url}
            alt={activeImage.alt}
            onMouseDown={(event) => event.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              type="button"
              className="product-gallery-modal__next"
              aria-label="Следующее изображение"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={showNext}
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
