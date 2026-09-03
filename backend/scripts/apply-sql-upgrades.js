#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.resolve(__dirname, '..');
const sqlRoot = path.resolve(repoRoot, 'sql');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
}

function pickEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function resolveSqlFiles(args) {
  if (args.length > 0) {
    return args.map((file) =>
      path.isAbsolute(file) ? file : path.resolve(repoRoot, file),
    );
  }

  return [
    path.resolve(sqlRoot, 'DATABASE_USER_MANAGEMENT_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_PRODUCTS_MODULE_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_GEMSTONE_PACKET_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_STONE_PACKETS_INT_ID_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_DESIGN_MASTERS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_MASTER_TABLE_COLUMNS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_MASTER_ID_RELATION_GAPS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_VENDOR_NAMES_EMAIL_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_DESIGN_BARCODE_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_DESIGN_NAME_FAMILY_UNIQUENESS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DESIGN_LEGACY_UUID_DROP_CLEANUP.sql'),
    path.resolve(sqlRoot, 'DATABASE_USER_LAST_SEEN_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_SPIFF_REWARDS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_SPIFF_DECIMAL_POINTS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_SPIFF_LEDGER_UPDATED_AT_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_SPIFF_CANCEL_REVERSAL_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_SPIFF_SETTINGS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_SPIFF_COLLATION_FIX.sql'),
    path.resolve(sqlRoot, 'METAL_PRICE_HISTORY_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DESIGN_OVERHEAD_ROWS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DESIGN_MEDIA_LIBRARY_SOFT_DELETE_UPGRADE.sql'),
    path.resolve(sqlRoot, 'ORDER_COMPLETED_SALES_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_ACTIVITY_EVENTS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'USER_PERMISSION_ACTIONS_UPGRADE.sql'),
    path.resolve(sqlRoot, 'DATABASE_EMAIL_TEMPLATES_UPGRADE.sql'),
  ].filter((filePath) => {
    if (fs.existsSync(filePath)) return true;
    console.warn(
      `[skip] SQL file not found, skipping: ${path.relative(repoRoot, filePath)}`,
    );
    return false;
  });
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;
  let escaped = false;

  for (const char of sql) {
    current += char;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === ';') {
      const statement = current.trim();
      if (statement) statements.push(statement.slice(0, -1).trim());
      current = '';
    }
  }

  const last = current.trim();
  if (last) statements.push(last);
  return statements;
}

function stripSqlComments(statement) {
  return statement
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

function splitAlterClauses(clausesSql) {
  const clauses = [];
  let current = '';
  let quote = null;
  let escaped = false;
  let parenDepth = 0;

  for (const char of clausesSql) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      current += char;
      escaped = true;
      continue;
    }

    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      current += char;
      quote = char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')' && parenDepth > 0) parenDepth -= 1;

    if (char === ',' && parenDepth === 0) {
      const clause = current.trim();
      if (clause) clauses.push(clause);
      current = '';
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) clauses.push(last);
  return clauses;
}

function expandMysqlCompatibleStatements(statement) {
  const cleaned = stripSqlComments(statement);
  if (!/\bIF\s+NOT\s+EXISTS\b/i.test(cleaned)) return [statement];

  const alterMatch = cleaned.match(/^ALTER\s+TABLE\s+(`?[\w]+`?)\s+([\s\S]+)$/i);
  if (alterMatch) {
    const [, tableName, clausesSql] = alterMatch;
    const clauses = splitAlterClauses(clausesSql);
    const expanded = [];

    for (const clause of clauses) {
      if (/^ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/i.test(clause)) {
        expanded.push({
          sql: `ALTER TABLE ${tableName} ${clause.replace(/^ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/i, 'ADD COLUMN')}`,
          ignoreErrorCodes: ['ER_DUP_FIELDNAME'],
        });
        continue;
      }

      if (/^ADD\s+(UNIQUE\s+)?(KEY|INDEX)\s+IF\s+NOT\s+EXISTS\b/i.test(clause)) {
        expanded.push({
          sql: `ALTER TABLE ${tableName} ${clause.replace(/^ADD\s+(UNIQUE\s+)?(KEY|INDEX)\s+IF\s+NOT\s+EXISTS\b/i, (_match, uniquePrefix = '', keyWord) => `ADD ${uniquePrefix || ''}${keyWord}`)}`,
          ignoreErrorCodes: ['ER_DUP_KEYNAME'],
        });
        continue;
      }

      expanded.push(`ALTER TABLE ${tableName} ${clause}`);
    }

    return expanded;
  }

  if (/^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\b/i.test(cleaned)) {
    return [
      {
        sql: cleaned.replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\b/i, (_match, uniquePrefix = '') => `CREATE ${uniquePrefix || ''}INDEX`),
        ignoreErrorCodes: ['ER_DUP_KEYNAME'],
      },
    ];
  }

  return [statement];
}

async function runSqlFile(connection, sql) {
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    const expandedStatements = expandMysqlCompatibleStatements(statement);

    for (const expandedStatement of expandedStatements) {
      const sqlText =
        typeof expandedStatement === 'string'
          ? expandedStatement
          : expandedStatement.sql;
      const ignoreErrorCodes =
        typeof expandedStatement === 'string'
          ? []
          : expandedStatement.ignoreErrorCodes;

      try {
        await connection.query(sqlText);
      } catch (error) {
        if (!ignoreErrorCodes.includes(error.code)) throw error;
      }
    }
  }
}

async function main() {
  loadDotEnv(path.resolve(backendRoot, '.env'));

  const host = pickEnv('DATABASE_HOST', 'MYSQLHOST', 'DB_HOST');
  const port = Number.parseInt(pickEnv('DATABASE_PORT', 'MYSQLPORT', 'DB_PORT') || '3306', 10);
  const user = pickEnv('DATABASE_USER', 'MYSQLUSER', 'DB_USER');
  const password = pickEnv('DATABASE_PASSWORD', 'MYSQLPASSWORD', 'DB_PASSWORD');
  const database = pickEnv('DATABASE_NAME', 'MYSQLDATABASE', 'DB_NAME');
  const sslEnabled = /^true$/i.test(pickEnv('DATABASE_SSL', 'MYSQL_SSL'));

  if (!host || !user || !database) {
    throw new Error(
      'Missing DB connection vars. Set DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME (or MYSQL* equivalents).',
    );
  }

  const files = resolveSqlFiles(process.argv.slice(2));
  if (files.length === 0) {
    throw new Error('No SQL upgrade files found to apply.');
  }

  console.log(`Connecting to DB ${database} at ${host}:${port} as ${user}`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });

  try {
    for (const filePath of files) {
      const sql = fs.readFileSync(filePath, 'utf8');
      const label = path.relative(repoRoot, filePath);
      console.log(`Applying ${label} ...`);
      await runSqlFile(connection, sql);
      console.log(`Applied ${label}`);
    }
    console.log('All SQL upgrades completed successfully.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('SQL upgrade failed.');
  console.error(error.message || error);
  process.exit(1);
});

