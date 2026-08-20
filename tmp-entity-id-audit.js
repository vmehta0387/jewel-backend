const fs = require('fs');
const path = require('path');
const root = path.resolve('backend/src');
const files = [];
function walk(dir){
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith('.entity.ts')) files.push(p);
  }
}
walk(root);
const issues = [];
function lineOf(text, idx){ return text.slice(0, idx).split(/\r?\n/).length; }
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i=0;i<lines.length;i++) {
    const l = lines[i];
    if (l.includes('@PrimaryGeneratedColumn')) {
      let block = lines.slice(i, Math.min(i+4, lines.length)).join('\n');
      const propLine = lines.slice(i+1, i+6).find(x => /^\s*\w+\??\s*:/.test(x));
      const prop = propLine && propLine.trim();
      if (!/type\s*:\s*['"]int['"]/.test(l) && !/@PrimaryGeneratedColumn\(\s*\)/.test(l)) {
        issues.push({kind:'Primary decorator missing type:int', file, line:i+1, code:l.trim(), prop});
      }
      if (prop && !/:\s*number\b/.test(prop)) {
        issues.push({kind:'Primary TS type not number', file, line:i+1, code:l.trim(), prop});
      }
    }
    if (l.includes('@Column')) {
      const next = lines.slice(i+1, i+7).find(x => /^\s*\w+\??\s*:/.test(x));
      if (!next) continue;
      const prop = next.trim();
      const nameMatch = l.match(/name\s*:\s*['"]([^'"]+)['"]/) || prop.match(/^(\w+)/);
      const dbName = nameMatch ? nameMatch[1] : '';
      const propName = prop.match(/^(\w+)/)?.[1] || '';
      const isRef = /(^id$|_id$|Id$)/.test(dbName) || /(^id$|Id$)/.test(propName);
      const exclude = ['device_id','event_key','giftbit_request_id','ijewel_model_id'].includes(dbName);
      if (!isRef || exclude) continue;
      const tsOk = /:\s*number(\s*\|\s*null)?\b/.test(prop);
      const colHasInt = /type\s*:\s*['"]int['"]/.test(l);
      if (!tsOk) issues.push({kind:'Reference TS type not number', file, line:i+1, code:l.trim(), prop});
      if (!colHasInt) issues.push({kind:'Reference column missing type:int', file, line:i+1, code:l.trim(), prop});
    }
  }
}
for (const it of issues) {
  console.log(`${it.kind}\n${it.file}:${it.line}\n  ${it.code}\n  ${it.prop || ''}`);
}
console.log(`TOTAL_ISSUES=${issues.length}`);
