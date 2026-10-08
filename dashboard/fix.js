const fs = require('fs');

// 1. customers
let c1 = fs.readFileSync('src/app/customers/page.tsx', 'utf8');
c1 = c1.replace(/config\.pointsRequired/g, 'config.spendRequiredForOnePoint');
fs.writeFileSync('src/app/customers/page.tsx', c1);

// 2. due
let c2 = fs.readFileSync('src/app/due/page.tsx', 'utf8');
c2 = c2.replace(/title="Full Payment"/g, '');
fs.writeFileSync('src/app/due/page.tsx', c2);

// 3. expenses
let c3 = fs.readFileSync('src/app/expenses/page.tsx', 'utf8');
c3 = c3.replace(/expenseService\.delete\(confirmModal\.id\)/g, 'expenseService.delete(confirmModal.id as string)');
c3 = c3.replace(/e\.id !== confirmModal\.id/g, 'e.id !== (confirmModal.id as string)');
fs.writeFileSync('src/app/expenses/page.tsx', c3);

// 4. inventory
let c4 = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');
c4 = c4.replace(/newSellingPrice: item\.sellingPrice\r?\n.*?\}/g, "newSellingPrice: item.sellingPrice,\n        supplierId: item.supplierId || ''\n      }");
c4 = c4.replace(/minStockLevel: 5\r?\n.*?\}/g, "minStockLevel: 5,\n          supplierId: ''\n        }");
fs.writeFileSync('src/app/inventory/page.tsx', c4);

// 5. settings
let c5 = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
const dispatcher = `
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
`;
if (!c5.includes('handleConfirmAction =')) {
    c5 = c5.replace("const filteredStaff = staffList.filter", dispatcher + "\n  const filteredStaff = staffList.filter");
}
fs.writeFileSync('src/app/settings/page.tsx', c5);
