const fs = require('fs');
let content = fs.readFileSync('src/app/due/page.tsx', 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync('src/app/due/page.tsx', content, 'utf8');
