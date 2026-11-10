import {
  Flame,
  Leaf,
  Sparkles,
  Star,
  Tag
} from "lucide-react";

import type {
  LucideIcon
} from "lucide-react";

type ProductDescriptionProps = {
  aboutTea: string;
  taste: string;
  aroma: string;
  effect: string;
  beneficialProperties: string;
};

type DescriptionItem = readonly [
  LucideIcon,
  string,
  string
];

export default function ProductDescription({
  aboutTea,
  taste,
  aroma,
  effect,
  beneficialProperties
}: ProductDescriptionProps) {

  const allItems: DescriptionItem[] = [
    [Leaf, "О чае", aboutTea],
    [Tag, "Вкус", taste],
    [Flame, "Аромат", aroma],
    [Star, "Эффект", effect],
    [Sparkles, "Полезные свойства", beneficialProperties]
  ];

  const items = allItems.filter(
    ([, , text]) =>
      text.trim().length > 0
  );

  if (items.length === 0) {
    return null;
  }


  return (
    <section className="product-detail-section">
      <h2>Описание</h2>
      <div className="product-accordion">
        {items.map(([Icon, title, text]) => (
          <div key={title} className="product-accordion__item">
            <div
              className="product-accordion__static-heading"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                fontWeight: 500
              }}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{title}</span>
            </div>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
