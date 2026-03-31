const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/DesignsScreen.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// The main product card in the grid
c = c.replace(
  /designCard:\s*\{[^}]*backgroundColor:\s*'rgba\(255, 252, 245, 0\.82\)',/g,
  "designCard: {\n    backgroundColor: 'rgba(255, 255, 255, 0.15)',\n    borderWidth: 1,\n    borderColor: '#8B7355',"
);

// If the user's grid is empty, also upgrade the Empty State wrapper
c = c.replace(
  /emptyState:\s*\{[^}]*backgroundColor:\s*'#fbf7f2',/g,
  "emptyState: {\n    alignItems: 'center',\n    backgroundColor: 'rgba(255, 255, 255, 0.15)',\n    borderRadius: 12,\n    paddingHorizontal: 22,\n    paddingVertical: 34,\n    borderWidth: 1,\n    borderColor: '#8B7355',\n    marginTop: 20,"
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Successfully embedded eminent borders and glass backings onto Design cards!');
