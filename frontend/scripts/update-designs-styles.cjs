const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/DesignsScreen.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace constants
code = code.replace(/backgroundColor: '#FAF8F5',/g, "backgroundColor: '#FFFFFF',");
code = code.replace(/backgroundColor: 'transparent',/, "backgroundColor: '#FFFFFF',");
code = code.replace(/borderColor: '#EBE5DF',/g, "borderColor: '#E5E5EA',");
code = code.replace(/color: '#1A1A1A',/g, "color: '#000000',");
code = code.replace(/color: '#8C8C8C',/g, "color: '#8E8E93',");

// Sharp filter chips
code = code.replace(/borderRadius: 17,/g, "borderRadius: 0,");
code = code.replace(/backgroundColor: '#1A1A1A',/g, "backgroundColor: '#000000',");
code = code.replace(/borderColor: '#1A1A1A',/g, "borderColor: '#000000',");

// Sharp cards
code = code.replace(/borderRadius: 20,/g, "borderRadius: 0,");
code = code.replace(/borderRadius: 16,/g, "borderRadius: 0,");

// Remove shadows
code = code.replace(/shadowColor: '#000',[\s\S]*?elevation: 3,/g, "borderWidth: 1, borderColor: '#E5E5EA'");

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated DesignsScreen styles to stark monochrome via NodeJS');
