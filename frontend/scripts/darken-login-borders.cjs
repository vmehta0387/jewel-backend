const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../../mobile/src/screens/LoginScreen.tsx');
let loginCode = fs.readFileSync(loginPath, 'utf8');

loginCode = loginCode.replace(
  /borderColor:\s*'rgba\(255, 255, 255, 0\.3\)'/g,
  "borderColor: '#8B7355'" // Elegant muted golden brown
);

fs.writeFileSync(loginPath, loginCode, 'utf8');
console.log('Successfully darkened login input borders!');
