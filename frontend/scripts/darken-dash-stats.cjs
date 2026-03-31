const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(dashPath, 'utf8');

// The user is finding the "light" (white/faint) text hard to read on the golden stat boxes.
// Replacing it with the deepest, boldest heavy Espresso weight.
code = code.replace(
  /statLabel:\s*\{[^}]*\}/,
  "statLabel: { fontSize: 13, color: '#2C1E16', lineHeight: 16, marginBottom: 6, fontWeight: '700' }"
);

// Stat value into strong bold espresso
code = code.replace(
  /statValue:\s*\{[^}]*\}/,
  "statValue: { fontFamily: 'serif', fontSize: 26, fontWeight: '800', color: '#2C1E16' }"
);

fs.writeFileSync(dashPath, code, 'utf8');
console.log('Successfully applied dark Espresso anchor texts to the stat cards!');
