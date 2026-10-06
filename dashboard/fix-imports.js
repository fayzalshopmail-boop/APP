const fs = require('fs');
let content = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

if (!content.includes('writeBatch')) {
  content = content.replace(
    "} from 'firebase/firestore';",
    "  writeBatch,\n  getDoc,\n  getDocs,\n  query,\n  where\n} from 'firebase/firestore';"
  );
  fs.writeFileSync('src/lib/services/shopTransaction.ts', content, 'utf8');
  console.log('Fixed imports in shopTransaction.ts');
}
