const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../../mobile/src/screens/LoginScreen.tsx');
let loginCode = fs.readFileSync(loginPath, 'utf8');

// Replace the specific backgroundColor inside the `card` style
loginCode = loginCode.replace(
  /card:\s*\{[\s\S]*?backgroundColor:\s*colors\.card,/g,
  "card: {\n    backgroundColor: 'transparent',"
);

// Optional: Also make inputs transparent to match the glassy floating feel?
// The user said "that box", which refers to the main card. We will leave inputs alone for contrast, or make them highly transparent glass:
loginCode = loginCode.replace(
  /input:\s*\{[^}]*backgroundColor:\s*colors\.card,/g,
  "input: {\n    borderWidth: 1,\n    borderColor: 'rgba(255, 255, 255, 0.3)',\n    borderRadius: 12,\n    paddingVertical: 14,\n    paddingHorizontal: 16,\n    marginBottom: spacing.lg,\n    backgroundColor: 'rgba(255, 255, 255, 0.15)',\n    color: colors.text,"
);

fs.writeFileSync(loginPath, loginCode, 'utf8');
console.log('Successfully made the login card transparent!');
