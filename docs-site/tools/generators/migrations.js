const fs = require('fs');
const path = require('path');
const { relativeUnix, readUtf8 } = require('./utils');

function generateMigrations(projectRoot) {
  const migrationsRoot = path.join(projectRoot, 'database', 'migrations');
  const modules = [];

  if (fs.existsSync(migrationsRoot)) {
    for (const entry of fs.readdirSync(migrationsRoot, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const dir = path.join(migrationsRoot, entry.name);
      const files = [];
      function collect(current) {
        for (const child of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const full = path.join(current, child.name);
          if (child.isDirectory()) collect(full);
          else if (child.name.toLowerCase().endsWith('.sql')) files.push(full);
        }
      }
      collect(dir);
      modules.push({ name: entry.name, files });
    }
  }

  const sections = modules.map((module) => {
    const rows = module.files.map((file) => {
      const content = readUtf8(file);
      const creates = [...content.matchAll(/CREATE\s+(?:TABLE|INDEX|UNIQUE\s+INDEX|FUNCTION|TRIGGER|EXTENSION)\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w]+)/gi)]
        .map((match) => match[1]);
      return `| \`${relativeUnix(projectRoot, file)}\` | ${creates.length ? creates.join(', ') : 'управляющий файл или пока пусто'} |`;
    }).join('\n');
    return `## ${module.name}\n\n| SQL-файл | Создаваемые объекты |\n|---|---|\n${rows || '| — | — |'}`;
  }).join('\n\n');

  return {
    stats: {
      modules: modules.length,
      files: modules.reduce((sum, module) => sum + module.files.length, 0)
    },
    markdown: `# Миграции\n\nПорядок и состав миграций базы данных.\n\n- Модулей: **${modules.length}**\n- SQL-файлов: **${modules.reduce((sum, module) => sum + module.files.length, 0)}**\n\n${sections}\n`
  };
}

module.exports = { generateMigrations };
