import type { ProductVariant } from "../product.types";

type ProductVariantsProps = {
  variants: readonly ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function ProductVariants({ variants, selectedId, onSelect }: ProductVariantsProps) {
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  return (
    <section className="product-variants">
      <div className="product-section-title">
        <h2>Выберите вес</h2>
        <button type="button">Какой вес выбрать?</button>
      </div>

      <div className="product-variants__grid">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            disabled={variant.status === "unavailable"}
            className={variant.id === selectedId ? "product-variant product-variant--active" : "product-variant"}
            onClick={() => onSelect(variant.id)}
          >
            <strong>{variant.label}</strong>
            <span>{variant.price.toLocaleString("ru-RU")} ₽</span>
            <small className={`product-variant__status product-variant__status--${variant.status}`}>
              {variant.status === "available" ? "В наличии" : variant.status === "low" ? "Мало" : "Нет в наличии"}
            </small>
          </button>
        ))}
      </div>

      <div className="product-variant-summary">
        <span>Выбрано: <strong>{selected.label}</strong></span>
        <span>Остаток: <strong>{selected.stock} шт.</strong></span>
        <strong>{selected.price.toLocaleString("ru-RU")} ₽</strong>
      </div>
    </section>
  );
}
