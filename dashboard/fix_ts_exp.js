const fs = require('fs');
let content = fs.readFileSync('src/app/expenses/page.tsx', 'utf8');

content = content.replace(
  /onValueChange=\{\(v\) => setFormData\(\{\.\.\.formData, category: v\}\)\}/,
  "onValueChange={(v) => setFormData({...formData, category: v || ''})}"
);

fs.writeFileSync('src/app/expenses/page.tsx', content);
console.log('Fixed expenses category');
