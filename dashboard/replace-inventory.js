const fs = require('fs');
const path = 'src/app/inventory/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import
if (!content.includes("shopTransactionService")) {
  content = content.replace(
    "import { inventoryService, InventoryItem } from '@/lib/services/inventory';",
    "import { inventoryService, InventoryItem } from '@/lib/services/inventory';\nimport { shopTransactionService } from '@/lib/services/shopTransaction';"
  );
}

// 2. Replace handleSaveSell
const regex = /const handleSaveSell = async \([\s\S]*?toast\.error\("Failed to process direct sell\."\);\r?\n    \}\r?\n  \};/m;

const replacement = `const handleSaveSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItem || sellData.quantity <= 0 || sellData.quantity > sellItem.stock) {
      return toast.error('Invalid quantity! Must be between 1 and current stock.');
    }
    if (sellData.price < 0) {
      return toast.error('Price cannot be negative!');
    }

    try {
      const { newStock } = await shopTransactionService.directSell(
        sellItem.id,
        sellData.quantity,
        sellData.price,
        sellData.customerName,
        user?.email || 'Unknown'
      );

      // 3. Update UI
      setItems(items.map(item => item.id === sellItem.id ? { ...item, stock: newStock } : item));
      setIsSellModalOpen(false);
      toast.success('Direct sell successful!');
    } catch (error: any) {
      console.error("Error direct selling", error);
      toast.error(error.message || "Failed to process direct sell.");
    }
  };`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced handleSaveSell successfully in inventory page');
} else {
  console.log('Pattern handleSaveSell not found in inventory page');
}
