const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');
content = content.replace(
    /<Button variant="ghost" size="icon" onClick=\{.*?handleOpenModal.*?title="Edit Part"[\s\S]*?<\/Button>\s*<Button variant="ghost" size="icon" onClick=\{.*?handleDeleteRequest.*?title="Delete Part"[\s\S]*?<\/Button>/,
    match => `{hasFullAccess && (<>${match}</>)}`
);
fs.writeFileSync('src/app/inventory/page.tsx', content);
console.log('Fixed');
