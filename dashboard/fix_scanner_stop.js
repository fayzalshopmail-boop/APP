const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BarcodeScannerModal.tsx', 'utf8');

content = content.replace(
  /scannerRef\.current\.stop\(\)\.then\(\(\) => \{[\s\S]*?scannerRef\.current\?\.clear\(\);[\s\S]*?scannerRef\.current = null;[\s\S]*?\}\)\.catch\(console\.error\);/,
  `scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch((e) => {
          // ignore error if it wasn't running
          scannerRef.current?.clear();
          scannerRef.current = null;
        });`
);

fs.writeFileSync('src/components/ui/BarcodeScannerModal.tsx', content);
console.log('Fixed scanner stop error');
