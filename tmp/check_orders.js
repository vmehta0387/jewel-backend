const mysql = require('../backend/node_modules/mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: 'ballast.proxy.rlwy.net',
    port: 29398,
    user: 'root',
    password: 'cVKgVLfpoyOvbqQTCNWrhsSQVxIkmoZm',
    database: 'railway',
  });
  const [rows] = await conn.query("SHOW TABLES LIKE 'orders'");
  console.log(rows);
  await conn.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
