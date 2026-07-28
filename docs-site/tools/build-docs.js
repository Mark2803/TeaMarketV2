const fs = require('fs');
const path = require('path');
const { writeUtf8, ensureDir, formatDate } = require('./generators/utils');
const { generateStructure } = require('./generators/structure');
const { generateDatabase } = require('./generators/database');
const { generateMigrations } = require('./generators/migrations');
const { generateDependencies } = require('./generators/dependencies');

const docsSiteRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(docsSiteRoot, '..');
const docsDir = path.join(docsSiteRoot, 'docs');
const generatedDocsDir = path.join(docsDir, 'generated');
const legacyGeneratedDir = path.join(docsSiteRoot, 'generated');

ensureDir(generatedDocsDir);
ensureDir(legacyGeneratedDir);

const generatedAt = formatDate();
const structure = generateStructure(projectRoot);
const database = generateDatabase(projectRoot);
const migrations = generateMigrations(projectRoot);
const dependencies = generateDependencies(projectRoot);

const overview = `# Автоматическая документация Tea Market V2

Документация сформирована непосредственно из текущих файлов проекта.

**Дата генерации:** ${generatedAt}

## Сводка

| Показатель | Значение |
|---|---:|
| Каталоги проекта | ${structure.stats.directories} |
| Файлы проекта | ${structure.stats.files} |
| Таблицы PostgreSQL | ${database.stats.tables} |
| Поля таблиц | ${database.stats.columns} |
| Внешние ключи | ${database.stats.foreignKeys} |
| Индексы | ${database.stats.indexes} |
| Модули миграций | ${migrations.stats.modules} |
| SQL-файлы | ${migrations.stats.files} |
| package.json | ${dependencies.stats.packages} |

## Что обновляется автоматически

- дерево каталогов и файлов;
- таблицы, поля, ограничения и внешние ключи PostgreSQL;
- ER-диаграмма Mermaid;
- индексы и состав миграций;
- npm-команды, пакеты и импорты исходного кода.

После изменений выполните из каталога \`docs-site\`:

\`\`\`powershell
npm run docs
\`\`\`
`;

const home = `# Tea Market V2

Техническая документация проекта.

Последнее автоматическое обновление: **${generatedAt}**.

## Разделы

- [Сводка](generated/overview.md)
- [Структура проекта](generated/structure.md)
- [База данных](generated/database.md)
- [Миграции](generated/migrations.md)
- [Зависимости и команды](generated/dependencies.md)
`;

const outputs = {
  'index.md': home,
  'generated/overview.md': overview,
  'generated/structure.md': structure.markdown,
  'generated/database.md': database.markdown,
  'generated/migrations.md': migrations.markdown,
  'generated/dependencies.md': dependencies.markdown
};

for (const [relativePath, content] of Object.entries(outputs)) {
  writeUtf8(path.join(docsDir, relativePath), content);
}

// Сохраняем совместимость со старым путём generated/index.md.
writeUtf8(path.join(legacyGeneratedDir, 'index.md'), overview);

console.log('Документация Tea Market V2 обновлена.');
console.log(`Страниц создано: ${Object.keys(outputs).length}`);
console.log(`Таблиц найдено: ${database.stats.tables}`);
console.log(`SQL-файлов найдено: ${migrations.stats.files}`);
console.log(`MkDocs: ${path.join(docsSiteRoot, 'mkdocs.yml')}`);
