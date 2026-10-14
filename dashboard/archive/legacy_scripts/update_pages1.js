const fs = require('fs');

// 1. page.tsx
let p1 = fs.readFileSync('src/app/page.tsx', 'utf8');
p1 = p1.replace(/<div className="hidden sm:flex items-center gap-3">[\s\S]*?<\/div>\s*<\/div>/, ''); 
// Wait, the outer div also contains the Time filter!
// Let's replace precisely:
p1 = p1.replace(/<div className="hidden sm:flex items-center gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<div className="flex items-center gap-3">/, '<div className="flex items-center justify-end w-full gap-3">');
fs.writeFileSync('src/app/page.tsx', p1);

// 2. customers/page.tsx
let p2 = fs.readFileSync('src/app/customers/page.tsx', 'utf8');
p2 = p2.replace(/<div>\s*<h2 className="text-2xl font-bold text-white mb-1">Customer Details<\/h2>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/, '');
p2 = p2.replace(/<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">/, '<div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-8">');
fs.writeFileSync('src/app/customers/page.tsx', p2);

// 3. inventory/page.tsx
let p3 = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');
p3 = p3.replace(/<div className="flex items-center gap-3">[\s\S]*?<h1.*?Inventory<\/h1>\s*<p.*?>.*?<\/p>\s*<\/div>\s*<\/div>/, '');
p3 = p3.replace(/<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">/, '<div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mb-2">');
fs.writeFileSync('src/app/inventory/page.tsx', p3);

console.log('Pages updated');
