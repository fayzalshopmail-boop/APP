const fs = require('fs');
let content = fs.readFileSync('src/components/ui/QuickAlerts.tsx', 'utf8');

const regex = /\/\/ 3\. Low Stock Count[\s\S]*?const lowStockCount = snapshotStock\.data\(\)\.count;/m;

const replacement = `// 3. Low Stock Count (Calculate in memory to respect minStockLevel)
        const snapshotStock = await getDocs(collection(db, 'inventory'));
        let lowStockCount = 0;
        snapshotStock.forEach(doc => {
          const item = doc.data();
          if (item.stock <= (item.minStockLevel || 5)) {
            lowStockCount++;
          }
        });`;

if (regex.test(content)) {
  content = content.replace("where, getCountFromServer", "where, getCountFromServer, getDocs");
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/ui/QuickAlerts.tsx', content, 'utf8');
  console.log('Fixed QuickAlerts low stock count');
} else {
  console.log('Regex failed');
}
