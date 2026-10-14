const fs = require('fs');
let content = fs.readFileSync('src/app/due/page.tsx', 'utf8');

content = content.replace(
  /<AlertCircle className="w-3\.5 h-3\.5 ml-1 text-red-500" title="Overdue!" \/>/,
  '<span title="Overdue!"><AlertCircle className="w-3.5 h-3.5 ml-1 text-red-500" /></span>'
);

fs.writeFileSync('src/app/due/page.tsx', content);
console.log('Fixed due title prop');
