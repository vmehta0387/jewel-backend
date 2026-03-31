const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../../mobile/src/screens/LoginScreen.tsx');
let loginCode = fs.readFileSync(loginPath, 'utf8');

loginCode = loginCode.replace(
  /content: \{\s*flex: 1,\s*zIndex: 1,\s*justifyContent: 'center',\s*alignItems: 'center',\s*width: '100%',\s*\}/,
  "content: {\n    flex: 1,\n    zIndex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    width: '100%',\n    paddingBottom: 120,\n  }"
);

fs.writeFileSync(loginPath, loginCode, 'utf8');
console.log('Successfully shifted the login block upward!');
