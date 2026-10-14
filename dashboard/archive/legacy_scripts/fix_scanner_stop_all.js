const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BarcodeScannerModal.tsx', 'utf8');

content = content.replace(
  /\.catch\(console\.error\);/g,
  `.catch(() => {
          if (scannerRef.current) {
            try { scannerRef.current.clear(); } catch(e) {}
            scannerRef.current = null;
          }
        });`
);

fs.writeFileSync('src/components/ui/BarcodeScannerModal.tsx', content);
console.log('Fixed all scanner stop errors');
