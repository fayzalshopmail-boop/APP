const fs = require('fs');

let d = fs.readFileSync('src/app/due/page.tsx', 'utf8');
d = d.replace(/title=['"]Full Payment['"]/g, '');
fs.writeFileSync('src/app/due/page.tsx', d);

let e = fs.readFileSync('src/app/expenses/page.tsx', 'utf8');
e = e.replace(/expenseService\.delete\(confirmModal\.id\)/g, 'expenseService.delete(confirmModal.id as string)');
e = e.replace(/e\.id !== confirmModal\.id/g, 'e.id !== (confirmModal.id as string)');
e = e.replace(/confirmModal\.id/g, '(confirmModal.id as string)');
fs.writeFileSync('src/app/expenses/page.tsx', e);

let i = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');
i = i.replace(/supplierId: item\.supplierId \|\| ''/g, ''); // remove duplicates
i = i.replace(/supplierId: ''/g, ''); // remove duplicates
i = i.replace(/minStockLevel: 5/g, "supplierId: '',\nminStockLevel: 5"); // add it once
i = i.replace(/minStockLevel: item\.minStockLevel \|\| 5/g, "supplierId: item.supplierId || '',\nminStockLevel: item.minStockLevel || 5");
if (!i.includes('shopTransactionService')) {
    i = "import { shopTransactionService } from '@/lib/services/shopTransaction';\n" + i;
}
fs.writeFileSync('src/app/inventory/page.tsx', i);

let s = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
const dispatcher = 
  const handleConfirmAction = async () => {
    const { actionType, payload } = confirmModal;
    if (!actionType) return;
    try {
      if (actionType === 'merge') {
        await executeMergeBackup(payload);
      } else if (actionType === 'wipe') {
        await executeWipeDatabase();
      } else if (actionType === 'deleteStaff') {
        await executeDeleteStaff(payload);
      }
    } finally {
      setConfirmModal({isOpen: false, actionType: null, payload: null});
    }
  };

  const getModalProps = () => {
    switch (confirmModal.actionType) {
      case 'wipe': return { title: "Wipe All Data?", message: "CRITICAL WARNING: This will PERMANENTLY DELETE ALL shop data.", confirmText: "Wipe Database" };
      case 'merge': return { title: "Merge Backup?", message: "WARNING: This will merge data from the backup file into your database.", confirmText: "Merge Data" };
      case 'deleteStaff': return { title: "Delete Staff Member?", message: "Are you sure you want to completely DELETE this staff member?", confirmText: "Delete Staff" };
      default: return { title: "Confirm", message: "Are you sure?", confirmText: "Confirm" };
    }
  };
;
if (!s.includes('handleConfirmAction =')) {
    s = s.replace(/const filteredStaff =/g, dispatcher + "\n  const filteredStaff =");
}
fs.writeFileSync('src/app/settings/page.tsx', s);
