const fs = require('fs');
let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

const regex = /const filteredCustomers = customers\.filter\(c => \{[\s\S]*?return matchesSearch && matchesStatus;\s*\}\);/;

const replacement = `const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.phone.includes(search) ||
                          c.deviceBrand?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (c.status || 'Received') === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (a.status === 'Delivered' && b.status !== 'Delivered') return 1;
    if (b.status === 'Delivered' && a.status !== 'Delivered') return -1;
    return 0;
  });`;

if(regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/customers/page.tsx', content);
  console.log('Customer sorting updated!');
} else {
  console.log('Regex failed');
}
