const fs = require('fs');
let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

page = page.replace(/{ label: 'None', value: '' }/g, "{ label: 'No Supplier', value: '' }");

fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
console.log('Renamed None to No Supplier');
