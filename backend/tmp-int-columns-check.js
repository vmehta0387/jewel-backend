const fs = require('fs');
const mysql = require('mysql2/promise');
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}
(async () => {
  const c = await mysql.createConnection({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT || 3306), user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME });
  const [rows] = await c.query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME LIKE '%_int' ORDER BY TABLE_NAME,COLUMN_NAME");
  console.table(rows);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
