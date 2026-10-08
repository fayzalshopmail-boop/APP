const fs = require('fs');
let text = fs.readFileSync('src/app/expenses/page.tsx', 'utf8');
text = text.replace(/e\.id !== confirmModal\.id/g, 'e.id !== (confirmModal.id as string)');
text = text.replace(/confirmModal\.id\)/g, '(confirmModal.id as string))'); // wait this might be risky.
fs.writeFileSync('src/app/expenses/page.tsx', text);
