import { Barcode, ExternalLink } from "lucide-react";

const tools = [
  {
    title: "Этикетки для Wildberries",
    description: "Генератор штрихкодов и этикеток для товаров Wildberries.",
    href: "/tools/wildberries-barcode-generator/index.html",
    Icon: Barcode
  }
];

export default function AdminToolsPage() {
  return <div className="admin-tools-page">
    <div className="admin-page-heading">
      <div>
        <h1>Инструменты</h1>
        <p>Дополнительные сервисы для работы с магазином.</p>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 18 }}>
      {tools.map(({ title, description, href, Icon }) =>
        <section className="admin-analytics-card" key={href} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icon size={24} aria-hidden="true" />
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <p style={{ margin: 0, flexGrow: 1 }}>{description}</p>
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", fontWeight: 600 }}>
            Открыть сервис <ExternalLink size={16} aria-hidden="true" />
          </a>
        </section>
      )}
    </div>
  </div>;
}
