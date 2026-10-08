const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BarcodeScannerModal.tsx', 'utf8');

content = content.replace(/console\.error\(err\);/g, 'console.warn("Camera fallback failed", err.name || err.message);');

fs.writeFileSync('src/components/ui/BarcodeScannerModal.tsx', content);
console.log('Silenced console error');
