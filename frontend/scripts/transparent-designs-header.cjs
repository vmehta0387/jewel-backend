const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/DesignsScreen.tsx');
let dsCode = fs.readFileSync(filePath, 'utf8');

// Replace the fixed header block to be entirely transparent
dsCode = dsCode.replace(
  /fixedHeader:\s*\{[^}]*backgroundColor:\s*'rgba\(255, 252, 245, 0\.82\)',/g,
  "fixedHeader: {\n    paddingHorizontal: 18,\n    paddingTop: 18,\n    paddingBottom: 10,\n    backgroundColor: 'transparent',"
);

// Replace the core search input body to be highly transparent glass 
dsCode = dsCode.replace(
  /searchShell:\s*\{[^}]*backgroundColor:\s*'rgba\(255, 252, 245, 0\.82\)',/g,
  "searchShell: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    backgroundColor: 'rgba(255, 255, 255, 0.15)',"
);

// Replace the filter chips
dsCode = dsCode.replace(
  /chip:\s*\{[^}]*backgroundColor:\s*'rgba\(255, 252, 245, 0\.82\)',/g,
  "chip: {\n    height: 34,\n    borderRadius: 12,\n    paddingHorizontal: 14,\n    alignItems: 'center',\n    justifyContent: 'center',\n    backgroundColor: 'rgba(255, 255, 255, 0.15)',"
);

// Replace the filter options button
dsCode = dsCode.replace(
  /filterButton:\s*\{[^}]*backgroundColor:\s*'rgba\(255, 252, 245, 0\.82\)',/g,
  "filterButton: {\n    width: 34,\n    height: 34,\n    borderRadius: 12,\n    alignItems: 'center',\n    justifyContent: 'center',\n    backgroundColor: 'rgba(255, 255, 255, 0.15)',"
);

fs.writeFileSync(filePath, dsCode, 'utf8');
console.log('Successfully made Designs header exactly transparent!');
