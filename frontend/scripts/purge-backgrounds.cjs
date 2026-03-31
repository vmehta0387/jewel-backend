const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../../mobile/src/screens/LoginScreen.tsx');
let loginCode = fs.readFileSync(loginPath, 'utf8');
// Target the exact View that's causing issues
loginCode = loginCode.replace(/<View style=\{styles\.background\} \/>/g, '');
loginCode = loginCode.replace(/backgroundColor: colors\.background,/g, "backgroundColor: 'transparent',");
fs.writeFileSync(loginPath, loginCode, 'utf8');

console.log('Successfully destroyed the impenetrable white barriers on Login Screen');
