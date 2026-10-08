const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BarcodeScannerModal.tsx', 'utf8');

const regex = /html5QrCode\.start\([\s\S]*?\{ facingMode: "environment" \},[\s\S]*?\{[\s\S]*?fps: 10,[\s\S]*?qrbox: \{ width: 280, height: 150 \},[\s\S]*?\},[\s\S]*?\(decodedText\) => \{[\s\S]*?onScan\(decodedText\);[\s\S]*?onClose\(\);[\s\S]*?\},[\s\S]*?\(errorMessage\) => \{[\s\S]*?\}[\s\S]*?\)\.catch\(\(err\) => \{[\s\S]*?console\.error\(err\);[\s\S]*?setError\('Could not access the back camera\.[^']*'\);[\s\S]*?\}\);/;

const replacement = `const startCamera = (facingMode: "environment" | "user") => {
   html5QrCode.start(
     { facingMode },
     { fps: 10, qrbox: { width: 280, height: 150 } },
     (decodedText) => {
       onScan(decodedText);
       onClose();
     },
     (errorMessage) => {
       // Ignored continuously while scanning
     }
   ).catch((err) => {
     if (facingMode === "environment") {
       console.warn("Back camera not found, trying front/default camera...");
       startCamera("user");
     } else {
       console.error(err);
       setError('Could not access any camera. Please make sure you have granted camera permissions and have a camera connected.');
     }
   });
 };

 startCamera("environment");`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/ui/BarcodeScannerModal.tsx', content);
  console.log('Fixed BarcodeScannerModal camera fallback');
} else {
  console.log('Regex failed');
}
