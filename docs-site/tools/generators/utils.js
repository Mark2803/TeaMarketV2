const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORES = new Set([
  '.git', '.idea', '.vscode', 'node_modules', 'site',
  'dist', 'build', 'coverage', '.cache'
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeUtf8(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, String(content).replace(/^\uFEFF/, ''), 'utf8');
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function walkFiles(rootDir, options = {}) {
  const ignores = new Set([...DEFAULT_IGNORES, ...(options.ignores || [])]);
  const extensions = options.extensions || null;
  const result = [];

  function visit(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    for (const entry of entries) {
      if (ignores.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (!extensions || extensions.includes(path.extname(entry.name).toLowerCase())) {
        result.push(fullPath);
      }
    }
  }

  if (fs.existsSync(rootDir)) visit(rootDir);
  return result;
}

function relativeUnix(from, target) {
  return path.relative(from, target).split(path.sep).join('/');
}

function escapeTable(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);
}

module.exports = {
  ensureDir,
  writeUtf8,
  readUtf8,
  walkFiles,
  relativeUnix,
  escapeTable,
  formatDate,
  DEFAULT_IGNORES
};
