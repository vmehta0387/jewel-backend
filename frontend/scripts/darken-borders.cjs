const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/DesignsScreen.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// The generic light cream border on searchShell is #efe4d8
code = code.replace(/borderColor: '#efe4d8'/g, "borderColor: '#8B7355'");

// Let's also strengthen the chip borders if they are too faint, from rgba(197, 160, 89, 0.3) to solid #8B7355
code = code.replace(/borderColor: 'rgba\\(197, 160, 89, 0.3\\)'/g, "borderColor: '#8B7355'");

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully darkened borders for UI components in DesignsScreen!');
