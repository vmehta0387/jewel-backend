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
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function pickEnv(...keys) {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      return String(raw).trim();
    }
  }
  return '';
}

async function main() {
  loadDotEnv(path.resolve(backendRoot, '.env'));
  loadDotEnv(path.resolve(repoRoot, '.env'));

  const host = pickEnv('DATABASE_HOST', 'DB_HOST');
  const port = Number(pickEnv('DATABASE_PORT', 'DB_PORT') || 3306);
  const user = pickEnv('DATABASE_USER', 'DB_USER');
  const password = pickEnv('DATABASE_PASSWORD', 'DB_PASSWORD');
  const database = pickEnv('DATABASE_NAME', 'DB_NAME');
  const sslEnabled = /^true$/i.test(pickEnv('DATABASE_SSL'));

  if (!host || !user || !database) {
    throw new Error(
      'Missing DB vars. Set DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME.',
    );
  }

  const emailArg = process.argv.find((item) => item.startsWith('--email='));
  const emailLikeArg = process.argv.find((item) => item.startsWith('--email-like='));
  const apply = process.argv.includes('--apply');

  const emailLike =
    (emailLikeArg ? emailLikeArg.replace('--email-like=', '').trim() : '') ||
    (emailArg ? `${emailArg.replace('--email=', '').trim()}%` : '') ||
    'nancy@bitace%';

  console.log(`Connecting to DB ${database} at ${host}:${port} as ${user}`);
  console.log(`Target user email LIKE '${emailLike}'`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: false,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const [users] = await connection.query(
      `SELECT id, email, first_name AS firstName, last_name AS lastName
       FROM users
       WHERE LOWER(email) LIKE LOWER(?)`,
      [emailLike],
    );

    if (!users || users.length === 0) {
      console.log('No matching user found.');
      return;
    }

    const userIds = users.map((row) => row.id);
    console.log(`Matched users: ${users.length}`);
    users.forEach((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      console.log(`- ${u.email} (${name || 'No Name'}) [${u.id}]`);
    });

    const [claimRows] = await connection.query(
      `SELECT id, claim_number AS claimNumber, status, requested_points AS requestedPoints, requested_amount_cents AS requestedAmountCents
       FROM spiff_redemption_claims
       WHERE user_id IN (?)`,
      [userIds],
    );

    const claimCount = claimRows.length;
    const totalPoints = claimRows.reduce((sum, row) => sum + Number(row.requestedPoints || 0), 0);
    const totalAmountCents = claimRows.reduce((sum, row) => sum + Number(row.requestedAmountCents || 0), 0);

    console.log(`Found claims: ${claimCount}`);
    console.log(`Total claimed points in those claims: ${totalPoints}`);
    console.log(`Total claimed amount: $${(totalAmountCents / 100).toFixed(2)}`);

    if (!apply) {
      console.log('Dry run complete. Re-run with --apply to delete matched claims.');
      return;
    }

    if (claimCount === 0) {
      console.log('Nothing to delete.');
      return;
    }

    const [result] = await connection.query(
      `DELETE FROM spiff_redemption_claims WHERE user_id IN (?)`,
      [userIds],
    );
    console.log(`Deleted claims: ${result.affectedRows || 0}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed to reset SPIFF claims by email.');
  console.error(error?.message || error);
  process.exitCode = 1;
});

