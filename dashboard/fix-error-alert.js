const fs = require('fs');
let code = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

code = code.replace(
  'alert("Error: Failed to save customer. Please check your internet connection.");',
  'alert("Error: " + ((error as any).message || String(error)));'
);

fs.writeFileSync('src/app/customers/page.tsx', code, 'utf8');
console.log('Updated error alert');
