import { Box, Globe2, Leaf, MapPin, RotateCcw, UserRound } from "lucide-react";

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

const rows = [
  [Leaf, "Вид чая", "teaType"],
  [Globe2, "Страна", "country"],
  [MapPin, "Регион", "region"],
  [UserRound, "Производитель", "producer"],
  [RotateCcw, "Степень ферментации", "fermentation"],
  [Box, "Форма продукта", "form"]
] as const;

export default function ProductSpecs({ product }: ProductSpecsProps) {
  return (
    <section className="product-detail-section">
      <h2>Характеристики</h2>
      <div className="product-specs">
        {rows.map(([Icon, label, key]) => (
          <div key={key} className="product-spec-row">
            <Icon size={18} strokeWidth={1.6} />
            <span>{label}</span>
            <strong>{product[key]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
