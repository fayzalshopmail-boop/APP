const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BarcodeScannerModal.tsx', 'utf8');

const regex1 = /scannerRef\.current\.stop\(\)\.then\(\(\) => \{[\s\S]*?scannerRef\.current\?\.clear\(\);[\s\S]*?scannerRef\.current = null;[\s\S]*?\}\)\.catch\(\(e\) => \{[\s\S]*?\/\/ ignore error if it wasn't running[\s\S]*?scannerRef\.current\?\.clear\(\);[\s\S]*?scannerRef\.current = null;[\s\S]*?\}\);/;

const replacement1 = `try {
          if (scannerRef.current.getState() === 2) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            }).catch(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            });
          } else {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        } catch (err) {
          try { scannerRef.current?.clear(); } catch(e){}
          scannerRef.current = null;
        }`;

content = content.replace(regex1, replacement1);

const regex2 = /scannerRef\.current\.stop\(\)\.then\(\(\) => \{[\s\S]*?scannerRef\.current\?\.clear\(\);[\s\S]*?scannerRef\.current = null;[\s\S]*?\}\)\.catch\(\(\) => \{[\s\S]*?if \(scannerRef\.current\) \{[\s\S]*?try \{ scannerRef\.current\.clear\(\); \} catch\(e\) \{\}[\s\S]*?scannerRef\.current = null;[\s\S]*?\}[\s\S]*?\}\);/;

content = content.replace(regex2, replacement1);

fs.writeFileSync('src/components/ui/BarcodeScannerModal.tsx', content);
console.log('Fixed synchronous stop errors');
