const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let c = fs.readFileSync(dashPath, 'utf8');

// 1. Fix the New Order text and icon 
c = c.replace(
  /<Ionicons name="add" size=\{20\} color=\{WHITE\} \/>/,
  '<Ionicons name="add" size={20} color="#FFFFFF" />'
);
c = c.replace(
  /<Text style=\{\[styles\.actionBtnText, \{ color: WHITE \}\]\}>New Order<\/Text>/,
  '<Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>New Order</Text>'
);

// 2. Fix the large Sales Amount (which currently uses the transparent WHITE constant)
c = c.replace(
  /salesAmount:\s*\{[^}]*color:\s*WHITE,/,
  "salesAmount: { fontFamily: 'serif', fontSize: 44, fontWeight: '600', color: '#FFFFFF',"
);

// 3. Fix the Sales This Week label beneath the amount
c = c.replace(
  /salesLabel:\s*\{.*?color:\s*'#AEAEB2',/,
  "salesLabel: { fontSize: 14, color: '#FFFFFF',"
);

fs.writeFileSync(dashPath, c, 'utf8');
console.log('Successfully repainted Dashboard texts to absolute solid white!');
