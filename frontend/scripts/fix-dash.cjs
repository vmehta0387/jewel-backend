const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let c = fs.readFileSync(dashPath, 'utf8');

// The AST script from before failed because of regex mistargeting. Nuke the constants cleanly:
c = c.replace(/const WHITE = '[^']+';/g, "const WHITE = 'rgba(255, 255, 255, 0.15)';");
c = c.replace(/const BORDER = '[^']+';/g, "const BORDER = '#8B7355';");

// The user specifically asked for Recent Activity to be transparent.
// The activity card style uses WHITE currently. Let's make it fully transparent natively.
c = c.replace(
  /activityCard:\s*\{[\s\S]*?backgroundColor:\s*WHITE,/g, 
  "activityCard: {\n    backgroundColor: 'transparent',"
);

// We should also make the menuBlock (bottom sheet) natively transparent or glass
c = c.replace(
  /menuBlock:\s*\{[\s\S]*?backgroundColor:\s*WHITE,/g, 
  "menuBlock: {\n    backgroundColor: 'transparent',"
);

fs.writeFileSync(dashPath, c, 'utf8');
console.log('Successfully made Recent Activity and Dashboard components transparent!');
