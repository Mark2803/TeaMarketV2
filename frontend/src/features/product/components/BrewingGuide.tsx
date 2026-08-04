import {
  Clock3,
  Droplets,
  RefreshCcw,
  Thermometer,
  Weight
} from "lucide-react";

import type {
  LucideIcon
} from "lucide-react";

type BrewingGuideProps = {
  waterTemperature: string;
  teaAmount: string;
  brewingTime: string;
  infusionCount: string;
  tips: string;
};

type BrewingRow = readonly [
  LucideIcon,
  string,
  string
];

export default function BrewingGuide(
  props: BrewingGuideProps
) {
  const allRows: BrewingRow[] = [
    [Thermometer, "Температура воды", props.waterTemperature],
    [Weight, "Количество чая", props.teaAmount],
    [Clock3, "Время заваривания", props.brewingTime],
    [RefreshCcw, "Количество проливов", props.infusionCount]
  ];

  const rows = allRows.filter(
    ([, , value]) =>
      value.trim().length > 0
  );

  if (
    rows.length === 0
    && !props.tips
  ) {
    return null;
  }

  return (
    <section className="product-detail-section">
      <h2>
        Заваривание
      </h2>

      <div className="brewing-card">
        {rows.map(([Icon, label, value]) => (
          <div
            key={label}
            className="brewing-row"
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

        {props.tips && (
          <div className="brewing-tip">
            <Droplets size={21} />

            <p>
              {props.tips}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
