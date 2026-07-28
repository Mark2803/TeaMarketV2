const fs = require('fs');
const path = require('path');
const { walkFiles, readUtf8, relativeUnix, escapeTable } = require('./utils');

function parsePackage(filePath, projectRoot) {
  try {
    const data = JSON.parse(readUtf8(filePath));
    return {
      file: relativeUnix(projectRoot, filePath),
      name: data.name || path.basename(path.dirname(filePath)),
      scripts: data.scripts || {},
      dependencies: { ...(data.dependencies || {}), ...(data.devDependencies || {}) }
    };
  } catch {
    return null;
  }
}

function generateDependencies(projectRoot) {
  const packageFiles = walkFiles(projectRoot)
    .filter((file) => path.basename(file) === 'package.json');
  const packages = packageFiles.map((file) => parsePackage(file, projectRoot)).filter(Boolean);

  const codeFiles = walkFiles(projectRoot, { extensions: ['.js', '.mjs', '.cjs', '.ts'] })
    .filter((file) => !file.includes(`${path.sep}docs-site${path.sep}tools${path.sep}generators${path.sep}`));
  const links = [];
  for (const file of codeFiles) {
    const content = readUtf8(file);
    const imports = new Set();
    for (const match of content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g)) {
      imports.add(match[1] || match[2] || match[3]);
    }
    if (imports.size) links.push({ file: relativeUnix(projectRoot, file), imports: [...imports].sort() });
  }

  const packageSections = packages.map((pkg) => {
    const deps = Object.entries(pkg.dependencies);
    const scripts = Object.entries(pkg.scripts);
    return `## ${pkg.name}\n\nФайл: \`${pkg.file}\`\n\n### Скрипты\n\n${scripts.length ? scripts.map(([name, command]) => `- \`npm run ${name}\` — \`${command}\``).join('\n') : '_Скрипты отсутствуют._'}\n\n### Пакеты\n\n${deps.length ? `| Пакет | Версия |\n|---|---|\n${deps.map(([name, version]) => `| ${escapeTable(name)} | ${escapeTable(version)} |`).join('\n')}` : '_Зависимости отсутствуют._'}`;
  }).join('\n\n');

  const importRows = links.length
    ? links.map((item) => `| \`${item.file}\` | ${item.imports.map((value) => `\`${value}\``).join(', ')} |`).join('\n')
    : '| — | — |';

  return {
    stats: { packages: packages.length, codeFiles: codeFiles.length, importFiles: links.length },
    markdown: `# Зависимости и команды\n\n## Импорты исходного кода\n\n| Файл | Импорты |\n|---|---|\n${importRows}\n\n${packageSections}\n`
  };
}

module.exports = { generateDependencies };
