#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.resolve(__dirname, '..');

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
    path.resolve(repoRoot, 'DATABASE_USER_MANAGEMENT_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_PRODUCTS_MODULE_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_GEMSTONE_PACKET_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_DESIGN_MASTERS_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_USER_LAST_SEEN_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_SPIFF_REWARDS_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_SPIFF_SETTINGS_UPGRADE.sql'),
    path.resolve(repoRoot, 'DATABASE_SPIFF_COLLATION_FIX.sql'),
  ].filter((filePath) => {
    if (fs.existsSync(filePath)) return true;
    console.warn(
      `[skip] SQL file not found, skipping: ${path.relative(repoRoot, filePath)}`,
    );
    return false;
  });
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
      await connection.query(sql);
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
