const fs = require('fs');
let content = fs.readFileSync('src/app/due/page.tsx', 'utf8');

const oldFiltered = /const filteredCustomers = customers\.filter\(c => \s*c\.name\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\) \|\| \s*c\.phone\.includes\(searchTerm\)\s*\);/g;

const newFiltered = `const filteredCustomers = customers
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });`;

content = content.replace(oldFiltered, newFiltered);
fs.writeFileSync('src/app/due/page.tsx', content, 'utf8');
console.log("Updated sorting in due page");
