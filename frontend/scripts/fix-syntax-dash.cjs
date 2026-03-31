const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(dashPath, 'utf8');

// I inadvertently stripped the trailing commas out of the JSON object when rewriting the typography properties!
// This explicitly searches for the missing commas and appends them to restore the application syntax.

code = code.replace(
  /statLabel:\s*\{[^}]*\}(?!\s*,)/g,
  (match) => match + ','
);

code = code.replace(
  /statValue:\s*\{[^}]*\}(?!\s*,)/g,
  (match) => match + ','
);

fs.writeFileSync(dashPath, code, 'utf8');
console.log('Successfully repatched the trailing commas onto the stat styles!');
