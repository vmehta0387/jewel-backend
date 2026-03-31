const fs = require('fs');
const path = require('path');

const doReplacements = (p) => {
  if (!fs.existsSync(p)) return;
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/'#000000'/gi, "'#2C1E16'");
  code = code.replace(/'#FFFFFF'/gi, "'rgba(255, 252, 245, 0.82)'"); // 82% opacity for elegant frosted glass effect over the golden background
  code = code.replace(/'#E5E5EA'/gi, "'rgba(197, 160, 89, 0.3)'");
  // Smooth out the harsh corners
  code = code.replace(/borderRadius: 0,/g, "borderRadius: 12,");
  code = code.replace(/borderTopRightRadius: 0,/g, "borderTopRightRadius: 12,");
  code = code.replace(/borderBottomRightRadius: 0,/g, "borderBottomRightRadius: 12,");
  // Ensure background strings missing quotes from the original aren't totally lost, mostly handled by theme though
  fs.writeFileSync(p, code, 'utf8');
}

// 1. Theme
const themeColors = `export const colors = {
  primary: '#C5A059',
  primaryDark: '#A67F3F',
  secondary: '#3E2723',
  accent: 'rgba(255, 255, 255, 0.5)',
  muted: 'rgba(255, 255, 255, 0.2)',
  background: 'transparent',
  card: 'rgba(255, 252, 245, 0.82)',
  text: '#2C1E16',
  textMuted: '#8B7355',
  border: 'rgba(197, 160, 89, 0.3)',
  success: '#2E4A35',
  warning: '#C5A059',
  danger: '#8A3A3A',
};`;
const themePath = path.join(__dirname, '../../mobile/src/theme.ts');
if (fs.existsSync(themePath)) {
  let themeCode = fs.readFileSync(themePath, 'utf8');
  themeCode = themeCode.replace(/export const colors = \{[\s\S]*?\};/, themeColors);
  // Soften standard radii too
  themeCode = themeCode.replace(/sm: 8,/, "sm: 8,");
  themeCode = themeCode.replace(/md: 12,/, "md: 14,");
  themeCode = themeCode.replace(/lg: 16,/, "lg: 18,");
  fs.writeFileSync(themePath, themeCode, 'utf8');
}

// 2. Screens
const screenDir = path.join(__dirname, '../../mobile/src/screens');
if (fs.existsSync(screenDir)) {
  fs.readdirSync(screenDir).forEach(file => {
    if (file.endsWith('.tsx')) doReplacements(path.join(screenDir, file));
  });
}

// 3. Components
const compDir = path.join(__dirname, '../../mobile/src/components');
if (fs.existsSync(compDir)) {
  fs.readdirSync(compDir).forEach(file => {
    if (file.endsWith('.tsx') && file !== 'Screen.tsx') doReplacements(path.join(compDir, file));
  });
}

// 4. Nav
const navPath = path.join(__dirname, '../../mobile/src/navigation/RootNavigator.tsx');
if (fs.existsSync(navPath)) {
  let navCode = fs.readFileSync(navPath, 'utf8');
  navCode = navCode.replace(/'#FFFFFF'/gi, "'rgba(255, 252, 245, 0.92)'");
  navCode = navCode.replace(/'#000000'/gi, "'#2C1E16'");
  navCode = navCode.replace(/'#A0A0A0'/gi, "'#8B7355'");
  navCode = navCode.replace(/'#1A1A1A'/gi, "'#2C1E16'"); // For active tab icons
  fs.writeFileSync(navPath, navCode, 'utf8');
}

console.log('App absolutely elevated to Ivory & Espresso Luxury');
