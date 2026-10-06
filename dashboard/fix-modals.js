const fs = require('fs');

const files = [
  'src/components/ui/ConfirmModal.tsx',
  'src/components/ui/InvoiceModal.tsx',
  'src/components/ui/InventoryManageModal.tsx',
  'src/components/ui/PartsUsedModal.tsx',
  'src/components/ui/PaymentModal.tsx',
  'src/components/ui/CustomerModal.tsx',
  'src/components/ui/BarcodeScannerModal.tsx'
];

let changed = 0;
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Remove hardcoded z-[50], z-[60], z-[70], z-[100]
    content = content.replace(/z-\[50\]/g, '');
    content = content.replace(/z-\[60\]/g, '');
    content = content.replace(/z-\[70\]/g, '');
    content = content.replace(/z-\[100\]/g, '');
    
    // Clean up multiple spaces that might result from removal
    content = content.replace(/className=" /g, 'className="');
    content = content.replace(/  +/g, ' ');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changed++;
    }
  }
});

console.log(`Updated z-index in ${changed} modals`);
