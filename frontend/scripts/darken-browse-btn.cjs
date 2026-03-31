const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(dashPath, 'utf8');

// The Browse Designs block is styled via actionBtnLight.
// Natively inject the strong golden-brown border into it without risking AST multiline breaks.
code = code.replace(
  /actionBtnLight: \{[A-Za-z0-9_:\s,.'"-]*\}/,
  "actionBtnLight: { backgroundColor: ACCENT, borderWidth: 1, borderColor: '#6B4D2C' }" // very dark rich brown
);

fs.writeFileSync(dashPath, code, 'utf8');
console.log('Successfully injected the darker border onto Browse Designs block!');
