const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/OrdersScreen.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// The user wants the Orders title text to be black (Espresso) instead of the glowing white with shadow we just set.
c = c.replace(
  /pageTitle:\s*\{\s*fontFamily:\s*'serif',\s*fontSize:\s*32,\s*lineHeight:\s*36,\s*fontWeight:\s*'700',\s*color:\s*'#FFFFFF',\s*marginBottom:\s*14,\s*textShadowColor:\s*'rgba\(0,0,0,0\.3\)',\s*textShadowOffset:\s*\{width:\s*0,\s*height:\s*2\},\s*textShadowRadius:\s*4,/,
  "pageTitle: {\n    fontFamily: 'serif',\n    fontSize: 32,\n    lineHeight: 36,\n    fontWeight: '700',\n    color: '#2C1E16',\n    marginBottom: 14,"
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Successfully reverted the Orders title text to Espresso Black!');
