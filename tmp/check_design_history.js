const mysql = require('../backend/node_modules/mysql2/promise');
const fs = require('fs');
const envRaw = fs.readFileSync('./backend/.env','utf8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) { const t=line.trim(); if(!t||t.startsWith('#')) continue; const i=t.indexOf('='); if(i<0) continue; env[t.slice(0,i).trim()] = t.slice(i+1).trim(); }
(async () => {
  const conn = await mysql.createConnection({host:env.DATABASE_HOST,port:Number(env.DATABASE_PORT||3306),user:env.DATABASE_USER,password:env.DATABASE_PASSWORD,database:env.DATABASE_NAME});
  const sql = "SELECT design_id, action_type, remarks, performed_at FROM design_history WHERE remarks LIKE '%inactive%' OR remarks LIKE '%active%' ORDER BY performed_at DESC LIMIT 30";
  const [rows] = await conn.query(sql);
  console.table(rows);
  await conn.end();
})().catch((e)=>{ console.error(e); process.exit(1); });

