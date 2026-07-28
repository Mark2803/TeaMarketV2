const fs = require('fs');
const path = require('path');
const { relativeUnix } = require('./utils');

const IGNORE = new Set([
  '.git', '.idea', '.vscode', 'node_modules', 'site',
  'dist', 'build', 'coverage', '.cache', 'generated'
]);

function buildTree(dir, prefix = '', depth = 0, maxDepth = 5) {
  if (depth > maxDepth || !fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !IGNORE.has(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name, 'ru');
    });

  const lines = [];
  entries.forEach((entry, index) => {
    const last = index === entries.length - 1;
    const marker = last ? '└── ' : '├── ';
    lines.push(`${prefix}${marker}${entry.name}${entry.isDirectory() ? '/' : ''}`);
    if (entry.isDirectory()) {
      lines.push(...buildTree(
        path.join(dir, entry.name),
        `${prefix}${last ? '    ' : '│   '}`,
        depth + 1,
        maxDepth
      ));
    }
  });
  return lines;
}

function countProject(projectRoot) {
  let files = 0;
  let directories = 0;

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        directories += 1;
        visit(fullPath);
      } else {
        files += 1;
      }
    }
  }

  visit(projectRoot);
  return { files, directories };
}

function generateStructure(projectRoot) {
  const stats = countProject(projectRoot);
  const tree = [path.basename(projectRoot) + '/', ...buildTree(projectRoot)];

  return {
    stats,
    markdown: `# Структура проекта

Автоматически построенное дерево проекта. Служебные каталоги и зависимости исключены.

- Каталогов: **${stats.directories}**
- Файлов: **${stats.files}**

\`\`\`text
${tree.join('\n')}
\`\`\`

## Корневой каталог

\`${relativeUnix(projectRoot, projectRoot) || '.'}\`
`
  };
}

module.exports = { generateStructure };
