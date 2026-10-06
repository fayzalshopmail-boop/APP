const fs = require('fs');
let page = fs.readFileSync('src/app/loyalty/page.tsx', 'utf8');

// Replace all \` with `
page = page.replace(/\\`/g, '`');
// Replace all \$ with $
page = page.replace(/\\\$/g, '$');

fs.writeFileSync('src/app/loyalty/page.tsx', page, 'utf8');
console.log('Fixed JSX backslashes in loyalty');
