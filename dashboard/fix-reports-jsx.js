const fs = require('fs');
let page = fs.readFileSync('src/app/reports/page.tsx', 'utf8');
page = page.replace(/\\`/g, '`');
page = page.replace(/\\\$/g, '$');
fs.writeFileSync('src/app/reports/page.tsx', page, 'utf8');
console.log('Fixed JSX backslashes');
