const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../../mobile/src/screens/LoginScreen.tsx');
let loginCode = fs.readFileSync(loginPath, 'utf8');

loginCode = loginCode.replace(
  /signInButton:\s*\{\s*backgroundColor:\s*'#2C1E16',\s*borderRadius:\s*12,\s*paddingVertical:\s*16,\s*marginTop:\s*10,\s*\}/g,
  "signInButton: {\n    backgroundColor: '#2C1E16',\n    borderRadius: 12,\n    paddingVertical: 14,\n    marginTop: 18,\n    width: '60%',\n    alignSelf: 'center',\n  }"
);

// If the previous replace failed because of exact whitespace mismatches, here is a more graceful regex:
loginCode = loginCode.replace(
  /signInButton: \{([^}]*)\}/,
  (match, inner) => {
    if (inner.includes('alignSelf')) return match; // already applied
    return `signInButton: {${inner}\n    width: '60%',\n    alignSelf: 'center',\n  }`;
  }
);

fs.writeFileSync(loginPath, loginCode, 'utf8');
console.log('Successfully adjusted the login button width and alignment!');
