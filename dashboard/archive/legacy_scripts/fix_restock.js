const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

content = content.replace(
  /const \[restockData, setRestockData\] = useState\(\{ addQuantity: 0, newPurchasePrice: 0, newSellingPrice: 0,\s*\}\);/,
  "const [restockData, setRestockData] = useState({ addQuantity: 1, newPurchasePrice: 0, newSellingPrice: 0, supplierId: '' });"
);

fs.writeFileSync('src/app/inventory/page.tsx', content);
console.log('Fixed restockData state properly');
