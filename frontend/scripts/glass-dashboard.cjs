const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(dashPath, 'utf8');

// The main total sales stats card (currently solid deep Espresso) -> Translucent Espresso
code = code.replace(/const DARK_CARD = '#2C1E16';/g, "const DARK_CARD = 'rgba(44, 30, 22, 0.75)';");
code = code.replace(/const DARK_CARD = '#000000';/g, "const DARK_CARD = 'rgba(44, 30, 22, 0.75)';");

// The secondary cards and quick actions (currently frosted Ivory) -> Subtly transparent glassy panes
code = code.replace(/const WHITE = 'rgba\\(255, 252, 245, 0\.82\\)';/g, "const WHITE = 'rgba(255, 255, 255, 0.15)';");
code = code.replace(/const WHITE = '#FFFFFF';/g, "const WHITE = 'rgba(255, 255, 255, 0.15)';");

// Light borders -> Elegantly dark golden-brown borders
code = code.replace(/const BORDER = 'rgba\\(197, 160, 89, 0\.3\\)';/g, "const BORDER = '#8B7355';");
code = code.replace(/const BORDER = '#E5E5EA';/g, "const BORDER = '#8B7355';");

// Any ACCENT blocks (like icon backgrounds) -> translucent
code = code.replace(/const ACCENT = 'rgba\\(255, 252, 245, 0\.82\\)';/g, "const ACCENT = 'rgba(255, 255, 255, 0.2)';");
code = code.replace(/const ACCENT = '#F5F5F7';/g, "const ACCENT = 'rgba(255, 255, 255, 0.2)';");

fs.writeFileSync(dashPath, code, 'utf8');
console.log('Successfully elevated the Dashboard to floating Glassmorphism!');
