const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace constants
code = code.replace(/const BG = 'transparent';/, "const BG = '#FFFFFF';");
code = code.replace(/const DARK_CARD = '#1A1A1A';/, "const DARK_CARD = '#000000';");
code = code.replace(/const TEXT_DARK = '#1A1A1A';/, "const TEXT_DARK = '#000000';");
code = code.replace(/const TEXT_MUTED = '#8C8C8C';/, "const TEXT_MUTED = '#8E8E93';");
code = code.replace(/const GREEN = '#2B593F';/, "const GREEN = '#000000';");
code = code.replace(/const RED = '#8B2635';/, "const RED = '#000000';");
code = code.replace(/const ACCENT = '#F2EAE1';/, "const ACCENT = '#F5F5F7';");
code = code.replace(/const BORDER = '#EBE5DF';/, "const BORDER = '#E5E5EA';");

// Replace sharp geometry
code = code.replace(/borderRadius: 16,\s+borderTopRightRadius: 16,/g, "borderRadius: 0,\n    borderTopRightRadius: 0,");
code = code.replace(/borderRadius: 20,/g, "borderRadius: 0,");
code = code.replace(/borderRadius: 16,/g, "borderRadius: 0,");
code = code.replace(/borderRadius: 10,/g, "borderRadius: 0,");

// Update specific borders and borders that were missing
code = code.replace(/shadowColor: '#000',[\s\S]*?elevation: 2,/g, "borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 0");
code = code.replace(/shadowColor: '#000',[\s\S]*?elevation: 5,/g, "borderWidth: 1, borderColor: '#000000', borderRadius: 0");

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated Dashboard styles to stark monochrome via NodeJS');
