import { ChevronDown, Flame, Leaf, Sparkles, Star, Tag } from "lucide-react";
import { useState } from "react";

const items = [
  [Leaf, "О чае и круг вкусового профиля", "Мягкий улун с фруктовыми, цветочными и сливочными оттенками."],
  [Tag, "Вкус", "Округлый, чистый, с лёгкой медовой сладостью и долгим послевкусием."],
  [Flame, "Аромат", "Цветочный, тёплый, с нотами выпечки и свежей зелени."],
  [Star, "Эффект", "Подходит для спокойной сосредоточенной чайной паузы."],
  [Sparkles, "Полезные свойства", "Чайный напиток без добавленного сахара и искусственных ароматизаторов."]
] as const;

export default function ProductDescription() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="product-detail-section">
      <h2>Описание</h2>
      <div className="product-accordion">
        {items.map(([Icon, title, text], index) => (
          <div key={title} className="product-accordion__item">
            <button type="button" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
              <Icon size={18} strokeWidth={1.6} />
              <span>{title}</span>
              <ChevronDown size={18} className={openIndex === index ? "product-accordion__chevron--open" : ""} />
            </button>
            {openIndex === index && <p>{text}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
