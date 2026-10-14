const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
content = content.replace("LogOut", "LogOut, Lock");
fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
console.log('Fixed import');
