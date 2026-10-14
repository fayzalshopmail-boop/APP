const fs = require('fs');
let modalContent = fs.readFileSync('src/components/ui/PartsUsedModal.tsx', 'utf8');

modalContent = modalContent.replace(
  'if (finalDue > 0 && !dueDate) {',
  'if (pendingStatus === "Delivered" && finalDue > 0 && !dueDate) {'
);

modalContent = modalContent.replace(
  'dueDate: finalDue > 0 ? dueDate : \'\'',
  'dueDate: (pendingStatus === "Delivered" && finalDue > 0) ? dueDate : \'\''
);

fs.writeFileSync('src/components/ui/PartsUsedModal.tsx', modalContent, 'utf8');
console.log('Success');
