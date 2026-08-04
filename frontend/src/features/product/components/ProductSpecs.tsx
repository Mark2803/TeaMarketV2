import {
  Box,
  Globe2,
  Leaf,
  MapPin,
  RotateCcw,
  UserRound
} from "lucide-react";

import type {
  LucideIcon
} from "lucide-react";

type ProductSpecsProps = {
  product: {
    teaType: string;
    country: string;
    region: string;
    producer: string;
    fermentation: string;
    form: string;
  };
};

type SpecRow = readonly [
  LucideIcon,
  string,
  string
];

export default function ProductSpecs({
  product
}: ProductSpecsProps) {
  const allRows: SpecRow[] = [
    [Leaf, "Вид чая", product.teaType],
    [Globe2, "Страна", product.country],
    [MapPin, "Регион", product.region],
    [UserRound, "Производитель", product.producer],
    [RotateCcw, "Степень ферментации", product.fermentation],
    [Box, "Форма продукта", product.form]
  ];

  const rows = allRows.filter(
    ([, , value]) =>
      value.trim().length > 0
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="product-detail-section">
      <h2>
        Характеристики
      </h2>

      <div className="product-specs">
        {rows.map(([Icon, label, value]) => (
          <div
            key={label}
            className="product-spec-row"
          >
            <Icon
              size={18}
              strokeWidth={1.6}
            />

            <span>
              {label}
            </span>

            <strong>
              {value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
