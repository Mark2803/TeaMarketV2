import { Barcode, ExternalLink } from "lucide-react";

const tools = [
  {
    title: "Этикетки для Wildberries",
    description: "Генератор штрихкодов и этикеток для товаров Wildberries.",
    href: "/tools/wildberries-barcode-generator/",
    Icon: Barcode,
  },
  {
    title: "Генератор GTIN-14",
    description: "Расчёт контрольной цифры GTIN-14 и генерация штрихкода ITF-14.",
    href: "/tools/gtin14-generator/",
    Icon: Barcode,
  },
];

export default function AdminToolsPage() {
  return (
    <div className="admin-tools-page">
      <div className="admin-page-heading">
        <div>
          <h1>Инструменты</h1>
          <p>Дополнительные сервисы для работы с магазином.</p>
        </div>
      </div>

      <div
        className="admin-tools-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 18,
        }}
      >
        {tools.map(({ title, description, href, Icon }) => (
          // Вся карточка — ссылка; инструмент открывается в новой вкладке.
          <a
            className="admin-analytics-card admin-tool-card"
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${title} — откроется в новой вкладке`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 140,
              color: "inherit",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={24} aria-hidden="true" />
              <h2 style={{ margin: 0, flexGrow: 1 }}>{title}</h2>
              <ExternalLink size={18} aria-hidden="true" style={{ opacity: 0.45 }} />
            </div>

            <p style={{ margin: 0 }}>{description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
