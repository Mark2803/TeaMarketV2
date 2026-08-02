import { Search } from "lucide-react";

type ProductGalleryProps = {
  images: readonly string[];
  activeIndex: number;
  onChange: (index: number) => void;
};

export default function ProductGallery({ images, activeIndex, onChange }: ProductGalleryProps) {
  return (
    <section className="product-gallery">
      <div className="product-gallery__main">
        <img src={images[activeIndex]} alt="Улун Габа Алишань" />
        <span className="product-gallery__badge">ХИТ ПРОДАЖ</span>
        <button type="button" className="product-gallery__zoom" aria-label="Увеличить изображение">
          <Search size={20} />
        </button>
      </div>

      <div className="product-gallery__thumbs">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={index === activeIndex ? "product-gallery__thumb product-gallery__thumb--active" : "product-gallery__thumb"}
            onClick={() => onChange(index)}
          >
            <img src={image} alt={`Дополнительное изображение ${index + 1}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
