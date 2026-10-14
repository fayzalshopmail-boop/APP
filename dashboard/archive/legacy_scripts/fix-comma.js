const fs = require('fs');
let content = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

content = content.replace(
  "increment\n  writeBatch,",
  "increment,\n  writeBatch,"
);
// Also just in case it's formatted differently:
content = content.replace(
  "increment\r\n  writeBatch,",
  "increment,\r\n  writeBatch,"
);

fs.writeFileSync('src/lib/services/shopTransaction.ts', content, 'utf8');
console.log('Fixed missing comma');
