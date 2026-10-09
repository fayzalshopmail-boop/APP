const fs = require('fs');
const file = 'src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/setTimeout\(\(\) => \{\s*router\.push\(item\.href\);\s*\}, 200\);/g, `setTimeout(() => {
                    router.push(item.href);
                  }, 350);`);

fs.writeFileSync(file, content);
console.log('Sidebar timeout increased to 350ms');
