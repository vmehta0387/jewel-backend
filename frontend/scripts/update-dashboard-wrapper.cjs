const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../mobile/src/screens/BranchDashboardScreen.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/import \{ SafeAreaView \} from 'react-native-safe-area-context';/, "import Screen from '../components/Screen';");
code = code.replace(/<SafeAreaView style=\{styles\.safe\}>/, "<Screen style={styles.safe}>");
code = code.replace(/<\/SafeAreaView>/, "</Screen>");

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully wrapped the Dashboard inside the global Screen component!');
