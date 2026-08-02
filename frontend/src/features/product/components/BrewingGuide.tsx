import { Clock3, Droplets, RefreshCcw, Thermometer, Weight } from "lucide-react";

const rows = [
  [Thermometer, "Температура воды", "85–90 °C"],
  [Weight, "Количество чая", "5–7 г на 150 мл"],
  [Clock3, "Время заваривания", "20–30 сек."],
  [RefreshCcw, "Количество проливов", "7–10 проливов"]
] as const;

export default function BrewingGuide() {
  return (
    <section className="product-detail-section">
      <h2>Заваривание</h2>
      <div className="brewing-card">
        {rows.map(([Icon, label, value]) => (
          <div key={label} className="brewing-row">
            <Icon size={18} strokeWidth={1.6} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div className="brewing-tip">
          <Droplets size={21} />
          <p>Используйте мягкую воду и прогревайте посуду перед завариванием для лучшего раскрытия вкуса.</p>
        </div>
      </div>
    </section>
  );
}
