/**
 * Подсказки по SEO-полям: как страница будет выглядеть в выдаче и что стоит исправить.
 * Если поле пустое, показывается значение, которое бэкенд подставит автоматически
 * (та же логика, что в backend/src/modules/seo/seo-html.routes.ts).
 */
type Props = {
  seoTitle: string;
  seoDescription: string;
  autoTitle: string;
  autoDescription: string;
  path: string;
  indexed?: boolean;
};

const TITLE = { min: 30, max: 65 };
const DESCRIPTION = { min: 70, max: 160 };

const clean = (value: string) => value.replace(/^##\s+/gm, "").replace(/\s+/g, " ").trim();

function check(label: string, value: string, limits: { min: number; max: number }, isAuto: boolean): string[] {
  const issues: string[] = [];
  if (!value) issues.push(`${label}: нечего подставить — заполните поле или описание.`);
  else if (value.length < limits.min) issues.push(`${label} короткий (${value.length} симв.), лучше ${limits.min}–${limits.max}.`);
  else if (value.length > limits.max) issues.push(`${label} длинный (${value.length} симв.), поисковик обрежет после ~${limits.max}.`);
  if (isAuto && value) issues.push(`${label} не заполнен — будет подставлен автоматически (см. превью).`);
  return issues;
}

export default function AdminSeoHints({ seoTitle, seoDescription, autoTitle, autoDescription, path, indexed = true }: Props) {
  const title = clean(seoTitle) || clean(autoTitle);
  const description = clean(seoDescription) || clean(autoDescription);
  const issues = [
    ...check("Заголовок", title, TITLE, !seoTitle.trim()),
    ...check("Описание", description, DESCRIPTION, !seoDescription.trim())
  ];
  if (!indexed) issues.unshift("Индексация выключена — страница не попадёт в Яндекс и Google.");

  return (
    <div className="admin-field admin-field-wide" style={{ gap: 8 }}>
      <span>Как будет выглядеть в поиске</span>
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
        <div style={{ color: "#1a0dab", fontSize: 18, lineHeight: 1.3 }}>
          {title.length > TITLE.max ? `${title.slice(0, TITLE.max)}…` : title || "—"}
        </div>
        <div style={{ color: "#006621", fontSize: 13 }}>tea-master-team.ru{path}</div>
        <div style={{ color: "#545454", fontSize: 14 }}>
          {description.length > DESCRIPTION.max ? `${description.slice(0, DESCRIPTION.max)}…` : description || "—"}
        </div>
      </div>
      {issues.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, color: "#8a5a00", fontSize: 13 }}>
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : <div style={{ color: "#2e7d32", fontSize: 13 }}>Заголовок и описание в норме.</div>}
    </div>
  );
}
