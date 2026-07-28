const fs = require('fs');
const path = require('path');
const { walkFiles, readUtf8, relativeUnix, escapeTable } = require('./utils');

function splitTopLevel(text) {
  const result = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const prev = text[i - 1];
    if (quote) {
      current += ch;
      if (ch === quote && prev !== '\\') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseTable(sql, sourceFile, projectRoot) {
  const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[\w"]+\.)?"?([\w]+)"?\s*\(([\s\S]*?)\);/i);
  if (!match) return null;

  const name = match[1];
  const body = match[2];
  const parts = splitTopLevel(body);
  const columns = [];
  const constraints = [];
  const foreignKeys = [];

  for (const partRaw of parts) {
    const part = partRaw.replace(/\s+/g, ' ').trim();
    if (!part) continue;
    if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\b/i.test(part)) {
      constraints.push(part);
      const fk = part.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(?:[\w"]+\.)?"?([\w]+)"?\s*\(([^)]+)\)/i);
      if (fk) {
        foreignKeys.push({
          columns: fk[1].replace(/"/g, '').trim(),
          targetTable: fk[2],
          targetColumns: fk[3].replace(/"/g, '').trim()
        });
      }
      continue;
    }

    const col = part.match(/^"?([\w]+)"?\s+([A-Z][A-Z0-9_]*(?:\s*\([^)]*\))?(?:\s+WITH(?:OUT)?\s+TIME\s+ZONE)?)/i);
    if (!col) continue;
    const definition = part.slice(col[0].length).trim();
    columns.push({
      name: col[1],
      type: col[2].toUpperCase(),
      nullable: !/\bNOT\s+NULL\b/i.test(definition) && !/\bPRIMARY\s+KEY\b/i.test(definition),
      defaultValue: (definition.match(/\bDEFAULT\s+(.+?)(?=\s+(?:NOT\s+NULL|PRIMARY\s+KEY|UNIQUE|CHECK|REFERENCES)\b|$)/i) || [])[1] || '',
      primaryKey: /\bPRIMARY\s+KEY\b/i.test(definition),
      unique: /\bUNIQUE\b/i.test(definition),
      definition
    });
  }

  const commentMatch = sql.match(new RegExp(`COMMENT\\s+ON\\s+TABLE\\s+(?:[\\w"]+\\.)?"?${name}"?\\s+IS\\s+'([\\s\\S]*?)'\\s*;`, 'i'));
  const comment = commentMatch ? commentMatch[1].replace(/''/g, "'").replace(/\s+/g, ' ').trim() : '';

  for (const constraint of constraints) {
    const pk = constraint.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pk) {
      for (const key of pk[1].split(',').map((v) => v.replace(/"/g, '').trim())) {
        const column = columns.find((item) => item.name === key);
        if (column) column.primaryKey = true;
      }
    }
    const uq = constraint.match(/UNIQUE\s*\(([^)]+)\)/i);
    if (uq) {
      for (const key of uq[1].split(',').map((v) => v.replace(/"/g, '').trim())) {
        const column = columns.find((item) => item.name === key);
        if (column && uq[1].split(',').length === 1) column.unique = true;
      }
    }
  }

  return {
    name,
    comment,
    columns,
    constraints,
    foreignKeys,
    source: relativeUnix(projectRoot, sourceFile)
  };
}

function parseIndexes(databaseDir, projectRoot) {
  const files = walkFiles(databaseDir, { extensions: ['.sql'] });
  const indexes = [];
  for (const file of files) {
    const sql = readUtf8(file).replace(/--.*$/gm, ' ');
    const regex = /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w]+)"?\s+ON\s+(?:[\w"]+\.)?"?([\w]+)"?\s*(?:USING\s+([\w]+)\s*)?\(([^;]+?)\)\s*;/gi;
    let match;
    while ((match = regex.exec(sql))) {
      indexes.push({
        unique: Boolean(match[1]),
        name: match[2],
        table: match[3],
        method: match[4] || 'btree',
        columns: match[5].replace(/\s+/g, ' ').trim(),
        source: relativeUnix(projectRoot, file)
      });
    }
  }
  return indexes;
}

function buildErDiagram(tables) {
  const lines = ['erDiagram'];
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      lines.push(`  ${fk.targetTable} ||--o{ ${table.name} : "${fk.columns}"`);
    }
  }
  if (lines.length === 1) lines.push('  PROJECT ||--o{ TABLE : contains');
  return lines.join('\n');
}

function generateDatabase(projectRoot) {
  const databaseDir = path.join(projectRoot, 'database');
  const files = walkFiles(databaseDir, { extensions: ['.sql'] });
  const tables = [];

  for (const file of files) {
    const sql = readUtf8(file);
    const table = parseTable(sql, file, projectRoot);
    if (table) tables.push(table);
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));
  const indexes = parseIndexes(databaseDir, projectRoot);

  const sections = tables.map((table) => {
    const rows = table.columns.map((column) => {
      const flags = [
        column.primaryKey ? 'PK' : '',
        column.unique ? 'UNIQUE' : ''
      ].filter(Boolean).join(', ');
      return `| ${escapeTable(column.name)} | ${escapeTable(column.type)} | ${column.nullable ? 'да' : 'нет'} | ${escapeTable(column.defaultValue)} | ${flags} |`;
    }).join('\n');

    const fkRows = table.foreignKeys.length
      ? `\n### Внешние ключи\n\n| Поле | Связанная таблица | Поле назначения |\n|---|---|---|\n${table.foreignKeys.map((fk) => `| ${escapeTable(fk.columns)} | ${fk.targetTable} | ${escapeTable(fk.targetColumns)} |`).join('\n')}\n`
      : '';

    const constraints = table.constraints.length
      ? `\n### Ограничения\n\n${table.constraints.map((item) => `- \`${item}\``).join('\n')}\n`
      : '';

    return `## ${table.name}\n\n${table.comment || '_Описание таблицы отсутствует._'}\n\nИсточник: \`${table.source}\`\n\n| Поле | Тип | NULL | Значение по умолчанию | Ключи |\n|---|---|---:|---|---|\n${rows}${fkRows}${constraints}`;
  }).join('\n\n');

  const indexRows = indexes.length
    ? indexes.map((idx) => `| ${idx.name} | ${idx.table} | ${escapeTable(idx.columns)} | ${idx.unique ? 'да' : 'нет'} | ${idx.method} |`).join('\n')
    : '| — | — | — | — | — |';

  return {
    stats: {
      tables: tables.length,
      columns: tables.reduce((sum, table) => sum + table.columns.length, 0),
      foreignKeys: tables.reduce((sum, table) => sum + table.foreignKeys.length, 0),
      indexes: indexes.length
    },
    tables,
    markdown: `# База данных\n\nДокументация автоматически построена по SQL-миграциям PostgreSQL.\n\n- Таблиц: **${tables.length}**\n- Полей: **${tables.reduce((sum, table) => sum + table.columns.length, 0)}**\n- Внешних ключей: **${tables.reduce((sum, table) => sum + table.foreignKeys.length, 0)}**\n- Индексов: **${indexes.length}**\n\n## ER-диаграмма\n\n\`\`\`mermaid\n${buildErDiagram(tables)}\n\`\`\`\n\n## Индексы\n\n| Индекс | Таблица | Поля/выражение | UNIQUE | Метод |\n|---|---|---|---:|---|\n${indexRows}\n\n${sections}\n`
  };
}

module.exports = { generateDatabase };
