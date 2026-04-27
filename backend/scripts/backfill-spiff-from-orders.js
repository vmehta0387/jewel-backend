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
      process.env[key] = value.replace(/^['\"]|['\"]$/g, '');
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

function toIntEnv(key, fallback) {
  const value = Number.parseInt(String(process.env[key] || '').trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || 'QUOTE';
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isFastClose(quoteAt, placedAt) {
  if (!quoteAt || !placedAt) return false;
  const diff = placedAt.getTime() - quoteAt.getTime();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

function shouldTreatAsPlaced(status, quoteAt, placedAt) {
  if (['PENDING_APPROVAL', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'].includes(status)) {
    return true;
  }

  // Final status can be CANCELLED even after being placed earlier.
  if (status === 'CANCELLED' && quoteAt && placedAt) {
    return placedAt.getTime() > quoteAt.getTime();
  }

  return false;
}

function buildEvents(order, config) {
  const status = normalizeStatus(order.status);
  const quoteAt = toDate(order.createdAt);
  const placedAt = toDate(order.updatedAt) || quoteAt;
  const orderRef = order.orderNumber || order.id;

  const events = [];

  // Backfill assumes each historical order originated from a quote step.
  if (config.quotePoints > 0) {
    events.push({
      eventType: 'QUOTE_CREATED',
      eventKey: `quote:${order.id}`,
      points: config.quotePoints,
      note: `Backfill: quote created (${orderRef})`,
      createdAt: quoteAt,
      metadata: {
        source: 'historical_backfill',
        status,
        orderNumber: order.orderNumber || null,
      },
    });
  }

  if (!shouldTreatAsPlaced(status, quoteAt, placedAt)) {
    return events;
  }

  if (config.orderPlacedPoints > 0) {
    events.push({
      eventType: 'ORDER_PLACED',
      eventKey: `order-placed:${order.id}`,
      points: config.orderPlacedPoints,
      note: `Backfill: order placed (${orderRef})`,
      createdAt: placedAt,
      metadata: {
        source: 'historical_backfill',
        status,
        orderNumber: order.orderNumber || null,
      },
    });
  }

  const valueBonus = Math.floor(toNumber(order.price) / 100) * config.orderValuePointsPer100;
  if (valueBonus > 0) {
    events.push({
      eventType: 'ORDER_VALUE_BONUS',
      eventKey: `order-value-bonus:${order.id}`,
      points: valueBonus,
      note: `Backfill: order value bonus (${orderRef})`,
      createdAt: placedAt,
      metadata: {
        source: 'historical_backfill',
        status,
        orderNumber: order.orderNumber || null,
        price: toNumber(order.price),
      },
    });
  }

  if (config.fastClosePoints > 0 && isFastClose(quoteAt, placedAt)) {
    events.push({
      eventType: 'FAST_CLOSE_BONUS',
      eventKey: `fast-close:${order.id}`,
      points: config.fastClosePoints,
      note: `Backfill: fast close bonus (${orderRef})`,
      createdAt: placedAt,
      metadata: {
        source: 'historical_backfill',
        status,
        orderNumber: order.orderNumber || null,
      },
    });
  }

  return events;
}

async function ensureSpiffTables(connection) {
  const [rows] = await connection.query("SHOW TABLES LIKE 'spiff_point_ledger'");
  if (!rows || rows.length === 0) {
    throw new Error('spiff_point_ledger table not found. Run DATABASE_SPIFF_REWARDS_UPGRADE.sql first.');
  }

  const [rows2] = await connection.query("SHOW TABLES LIKE 'spiff_redemption_claims'");
  if (!rows2 || rows2.length === 0) {
    throw new Error('spiff_redemption_claims table not found. Run DATABASE_SPIFF_REWARDS_UPGRADE.sql first.');
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
      'Missing DB connection vars. Set DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME.',
    );
  }

  const dryRun = !process.argv.includes('--apply');
  const config = {
    quotePoints: toIntEnv('SPIFF_QUOTE_CREATED_POINTS', 5),
    orderPlacedPoints: toIntEnv('SPIFF_ORDER_PLACED_POINTS', 50),
    orderValuePointsPer100: toIntEnv('SPIFF_ORDER_VALUE_POINTS_PER_100', 1),
    fastClosePoints: toIntEnv('SPIFF_FAST_CLOSE_BONUS_POINTS', 30),
  };

  console.log(`Connecting to DB ${database} at ${host}:${port} as ${user}`);
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
    await ensureSpiffTables(connection);

    const [orderRows] = await connection.query(
      `SELECT
        id,
        order_number AS orderNumber,
        company_id AS companyId,
        branch_id AS branchId,
        sales_rep_id AS salesRepId,
        status,
        price,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM orders
      WHERE sales_rep_id IS NOT NULL
        AND TRIM(sales_rep_id) <> ''`,
    );

    let totalEvents = 0;
    let totalPoints = 0;
    let inserted = 0;
    let duplicates = 0;

    for (const order of orderRows) {
      const events = buildEvents(order, config);
      totalEvents += events.length;

      for (const event of events) {
        totalPoints += event.points;
        if (dryRun) {
          continue;
        }

        const [existingRows] = await connection.query(
          'SELECT id FROM spiff_point_ledger WHERE event_key = ? LIMIT 1',
          [event.eventKey],
        );

        if (existingRows.length > 0) {
          duplicates += 1;
          continue;
        }

        await connection.execute(
          `INSERT INTO spiff_point_ledger (
            id,
            user_id,
            company_id,
            branch_id,
            order_id,
            event_type,
            event_key,
            points,
            note,
            metadata,
            created_at
          ) VALUES (
            UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )`,
          [
            order.salesRepId,
            order.companyId || null,
            order.branchId || null,
            order.id,
            event.eventType,
            event.eventKey,
            event.points,
            event.note,
            JSON.stringify(event.metadata || {}),
            event.createdAt || new Date(),
          ],
        );
        inserted += 1;
      }
    }

    const mode = dryRun ? 'DRY-RUN' : 'APPLY';
    console.log('----------------------------------------');
    console.log(`SPIFF Backfill Mode: ${mode}`);
    console.log(`Orders scanned: ${orderRows.length}`);
    console.log(`Events generated: ${totalEvents}`);
    console.log(`Points represented: ${totalPoints}`);
    if (!dryRun) {
      console.log(`Inserted events: ${inserted}`);
      console.log(`Skipped duplicates: ${duplicates}`);
    }

    const [ledgerCountRows] = await connection.query('SELECT COUNT(*) AS total FROM spiff_point_ledger');
    const [claimCountRows] = await connection.query('SELECT COUNT(*) AS total FROM spiff_redemption_claims');
    console.log(`Ledger rows now: ${ledgerCountRows?.[0]?.total ?? 0}`);
    console.log(`Claim rows now: ${claimCountRows?.[0]?.total ?? 0}`);
    console.log('----------------------------------------');

    if (dryRun) {
      console.log('Dry run complete. Re-run with --apply to persist backfill.');
    } else {
      console.log('Backfill complete.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('SPIFF backfill failed.');
  console.error(error?.message || error);
  process.exit(1);
});
