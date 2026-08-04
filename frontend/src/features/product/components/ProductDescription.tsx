import {
  ChevronDown,
  Flame,
  Leaf,
  Sparkles,
  Star,
  Tag
} from "lucide-react";

import type {
  LucideIcon
} from "lucide-react";

import {
  useState
} from "react";

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
  const [openIndex, setOpenIndex] =
    useState<number | null>(0);

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
      <h2>
        Описание
      </h2>

      <div className="product-accordion">
        {items.map(
          ([Icon, title, text], index) => (
            <div
              key={title}
              className="product-accordion__item"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenIndex(
                    openIndex === index
                      ? null
                      : index
                  )
                }
              >
                <Icon
                  size={18}
                  strokeWidth={1.6}
                />

                <span>
                  {title}
                </span>

                <ChevronDown
                  size={18}
                  className={
                    openIndex === index
                      ? "product-accordion__chevron--open"
                      : ""
                  }
                />
              </button>

              {openIndex === index && (
                <p>
                  {text}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
}
