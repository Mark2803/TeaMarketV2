import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";

type ProductGalleryProps = {
  images: readonly { url: string; alt: string }[];
  activeIndex: number;
  onChange: (index: number) => void;
};

export default function ProductGallery({
  images,
  activeIndex,
  onChange
}: ProductGalleryProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const activeImage = images[activeIndex] ?? images[0];

  const changeImage = (direction: number) => {
    if (images.length < 2) return;

    const nextIndex =
      (activeIndex + direction + images.length) % images.length;

    onChange(nextIndex);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }

    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;

    if (!start || images.length < 2 || !event.changedTouches.length) {
      return;
    }

    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;

    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.2) {
      return;
    }

    changeImage(dx < 0 ? 1 : -1);
  };

  useEffect(() => {
    if (!isZoomOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsZoomOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomOpen]);

  if (!activeImage) return null;

  return (
    <section className="product-gallery">
      <div
        className="product-gallery__main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStart.current = null; }}
        style={{ touchAction: "pan-y" }}
      >
        <img src={activeImage.url} alt={activeImage.alt} />

        <button
          type="button"
          className="product-gallery__zoom"
          onClick={() => setIsZoomOpen(true)}
          aria-label="Увеличить фотографию"
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
                "product-gallery__thumb" +
                (index === activeIndex ? " is-active" : "")
              }
              onClick={() => onChange(index)}
              aria-label={`Фотография ${index + 1}`}
            >
              <img src={image.url} alt={image.alt} />
            </button>
          ))}
        </div>
      )}

      {isZoomOpen && (
        <div
          className="product-gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фотографии товара"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            className="product-gallery-modal__close"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Закрыть"
          >
            <X size={24} />
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => { touchStart.current = null; }}
            style={{ touchAction: "pan-y" }}
          >
            <img
              src={activeImage.url}
              alt={activeImage.alt}
              draggable={false}
            />
          </div>
        </div>
      )}
    </section>
  );
}
