const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(dashPath, 'utf8');

// The statLabel was #8E8E93 (faint gray) which fades into gold background.
// Making it pure white and slightly larger (13pt vs 11pt) for readability.
code = code.replace(
  /statLabel:\s*\{[^}]*color:\s*TEXT_MUTED[^}]*\}/,
  "statLabel: { fontSize: 13, color: '#FFFFFF', lineHeight: 16, marginBottom: 6, fontWeight: '500' }"
);

// The statValue was Espresso #2C1E16, which can wash out if the stardust background is dark underneath.
// Making it pure glowing white and bumping the weight.
code = code.replace(
  /statValue:\s*\{[^}]*color:\s*TEXT_DARK[^}]*\}/,
  "statValue: { fontFamily: 'serif', fontSize: 26, fontWeight: '700', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }"
);

fs.writeFileSync(dashPath, code, 'utf8');
console.log('Successfully brightened Dashboard statistic typography!');
