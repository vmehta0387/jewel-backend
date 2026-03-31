const fs = require('fs');
const path = require('path');

// 1. Update Screen.tsx to accept bgImage prop
const screenPath = path.join(__dirname, '../../mobile/src/components/Screen.tsx');
let screenCode = fs.readFileSync(screenPath, 'utf8');

// Replace standard prop type with interface adding bgImage
screenCode = screenCode.replace(
  /const Screen: React\.FC<\{ children: React\.ReactNode; style\?: ViewStyle \}> = \(\{ children, style \}\) => \(/,
  "interface ScreenProps {\n  children: React.ReactNode;\n  style?: ViewStyle;\n  bgImage?: any;\n}\n\nconst Screen: React.FC<ScreenProps> = ({ children, style, bgImage }) => ("
);

// Inject dynamic source
screenCode = screenCode.replace(
  /source=\{require\('\.\.\/\.\.\/assets\/soft_golden\.png'\)\}/,
  "source={bgImage || require('../../assets/soft_golden.png')}"
);
fs.writeFileSync(screenPath, screenCode, 'utf8');


// 2. Update LoginScreen.tsx to pass the custom asset
const loginPath = path.join(__dirname, '../../mobile/src/screens/LoginScreen.tsx');
let loginCode = fs.readFileSync(loginPath, 'utf8');

// Ensure image is required at top or directly in component
loginCode = loginCode.replace(/<Screen style=\{styles\.container\}>/, "<Screen style={styles.container} bgImage={require('../../assets/login_bg.png')}>");
fs.writeFileSync(loginPath, loginCode, 'utf8');

console.log('Successfully wired login_bg.png specifically for the Login flow!');
