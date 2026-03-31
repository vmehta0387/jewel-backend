const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let dCode = fs.readFileSync(dashboardPath, 'utf8');
dCode = dCode.replace(/const BG = '#FFFFFF';/, "const BG = 'transparent';");
dCode = dCode.replace(/backgroundColor: BG/, "backgroundColor: 'rgba(255,255,255,0.4)'"); // for icon backing
fs.writeFileSync(dashboardPath, dCode, 'utf8');

const otherFiles = [
  '../../mobile/src/screens/DesignsScreen.tsx',
  '../../mobile/src/screens/DesignDetailScreen.tsx',
  '../../mobile/src/screens/OrdersScreen.tsx',
];

otherFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/screen: \{\s+backgroundColor: '#FFFFFF'/g, "screen: {\n    backgroundColor: 'transparent'");
  fs.writeFileSync(filePath, code, 'utf8');
});

console.log('Successfully enabled transparent wrappers to expose the golden gradient background!');
