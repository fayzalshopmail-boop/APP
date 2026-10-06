const fs = require('fs');
let modalContent = fs.readFileSync('src/components/ui/PartsUsedModal.tsx', 'utf8');

modalContent = modalContent.replace(
  'setSelectedParts([]);',
  'setSelectedParts(customer?.partsUsed || []);'
);

fs.writeFileSync('src/components/ui/PartsUsedModal.tsx', modalContent, 'utf8');
console.log('Success');
