const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  '../../mobile/src/screens/DesignDetailScreen.tsx',
  '../../mobile/src/screens/OrdersScreen.tsx',
  '../../mobile/src/screens/AiChatScreen.tsx',
  '../../mobile/src/navigation/RootNavigator.tsx'
];

filesToUpdate.forEach(relativePath => {
  const filePath = path.join(__dirname, relativePath);
  let code = fs.readFileSync(filePath, 'utf8');

  // Replace colors
  code = code.replace(/backgroundColor: '#FAF8F5'/g, "backgroundColor: '#FFFFFF'");
  code = code.replace(/backgroundColor: 'transparent'/g, "backgroundColor: '#FFFFFF'");
  code = code.replace(/borderColor: '#EBE5DF'/g, "borderColor: '#E5E5EA'");
  code = code.replace(/color: '#1A1A1A'/g, "color: '#000000'");
  code = code.replace(/color: '#8C8C8C'/g, "color: '#8E8E93'");
  code = code.replace(/color: '#686868'/g, "color: '#8E8E93'");
  
  // Specific Login UI / Previous Button shapes
  code = code.replace(/borderRadius: 24/g, "borderRadius: 0");
  code = code.replace(/borderRadius: 20/g, "borderRadius: 0");
  code = code.replace(/borderRadius: 18/g, "borderRadius: 0");
  code = code.replace(/borderRadius: 16/g, "borderRadius: 0");
  code = code.replace(/borderRadius: 17/g, "borderRadius: 0");
  code = code.replace(/borderRadius: 12/g, "borderRadius: 0");
  code = code.replace(/borderRadius: radii.lg/g, "borderRadius: 0");
  code = code.replace(/borderRadius: radii.md/g, "borderRadius: 0");
  
  // Darken elements for ultra-contrast
  code = code.replace(/backgroundColor: '#1A1A1A'/g, "backgroundColor: '#000000'");
  code = code.replace(/borderColor: '#1A1A1A'/g, "borderColor: '#000000'");

  // Remove shadows by making them effectively zero with borders
  code = code.replace(/shadowColor: '#000',[\s\S]*?elevation: [1-9],/g, "");

  fs.writeFileSync(filePath, code, 'utf8');
});

console.log('Successfully updated the remaining screens to stark monochrome via NodeJS');
