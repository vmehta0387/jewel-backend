#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
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

async function main() {
  loadDotEnv(path.resolve(__dirname, '..', '.env'));

  const connection = await mysql.createConnection({
    host: pickEnv('DATABASE_HOST', 'MYSQLHOST', 'DB_HOST'),
    port: Number.parseInt(pickEnv('DATABASE_PORT', 'MYSQLPORT', 'DB_PORT') || '3306', 10),
    user: pickEnv('DATABASE_USER', 'MYSQLUSER', 'DB_USER'),
    password: pickEnv('DATABASE_PASSWORD', 'MYSQLPASSWORD', 'DB_PASSWORD'),
    database: pickEnv('DATABASE_NAME', 'MYSQLDATABASE', 'DB_NAME'),
    ssl: /^true$/i.test(pickEnv('DATABASE_SSL', 'MYSQL_SSL')) ? { rejectUnauthorized: false } : undefined,
  });

  const tables = [
    'designs',
    'design_metals',
    'design_gemstones',
    'design_labors',
    'design_overheads',
    'design_findings',
    'design_process_stages',
    'design_vendors',
    'design_pricing_tiers',
    'design_stl_files',
    'design_history',
    'design_relevant',
    'design_media_library',
    'orders',
  ];

  const [columns] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (?)
       AND COLUMN_NAME IN ('id', 'legacy_uuid', 'design_id', 'design_id_int', 'family_design_id', 'family_design_id_int', 'related_design_id', 'related_design_id_int')
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [tables],
  );
  console.table(columns);

  const [constraints] = await connection.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (?)
       AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
    [tables],
  );
  console.table(constraints);

  await connection.end();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
