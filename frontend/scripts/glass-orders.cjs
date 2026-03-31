const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/OrdersScreen.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// Global replacement mapping opaque ivory to faintly frosted glass
c = c.replace(/backgroundColor:\s*'rgba\(255, 252, 245, 0\.82\)'/g, "backgroundColor: 'rgba(255, 255, 255, 0.15)'");

// Global replacement mapping faint borders to thick deep espresso/gold borders
c = c.replace(/borderColor:\s*'rgba\(197, 160, 89, 0\.3\)'/g, "borderColor: '#8B7355'");

// Target the fixedHeader and strip the glass completely off so the Page Title sits immediately on the starry background
c = c.replace(
  /fixedHeader:\s*\{[\s\S]*?backgroundColor:\s*'rgba\(255, 255, 255, 0.15\)',/g,
  "fixedHeader: {\n    paddingHorizontal: 18,\n    paddingTop: 18,\n    paddingBottom: 10,\n    backgroundColor: 'transparent',"
);

// Target text elements just in case transparent backing makes dark text fade out near the top
c = c.replace(
  /pageTitle:\s*\{[^}]*color:\s*'#2C1E16',/g,
  "pageTitle: {\n    fontFamily: 'serif',\n    fontSize: 32,\n    lineHeight: 36,\n    fontWeight: '700',\n    color: '#FFFFFF',\n    marginBottom: 14,\n    textShadowColor: 'rgba(0,0,0,0.3)',\n    textShadowOffset: {width: 0, height: 2},\n    textShadowRadius: 4,"
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Successfully forced Orders Screen perfectly into the Glassmorphic layout structure!');
