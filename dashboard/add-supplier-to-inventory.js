const fs = require('fs');

let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

if (!page.includes('import { supplierService, Supplier }')) {
  page = page.replace(
    "import { inventoryService, InventoryItem } from '@/lib/services/inventory';",
    "import { inventoryService, InventoryItem } from '@/lib/services/inventory';\nimport { supplierService, Supplier } from '@/lib/services/supplier';"
  );
  
  page = page.replace(
    "const [categories, setCategories] = useState<Category[]>([]);",
    "const [categories, setCategories] = useState<Category[]>([]);\n  const [suppliers, setSuppliers] = useState<Supplier[]>([]);"
  );
  
  page = page.replace(
    "const data = await inventoryService.getAll();",
    "const [data, sups] = await Promise.all([inventoryService.getAll(), supplierService.getAll()]);\n      setSuppliers(sups);"
  );
  
  // formData
  page = page.replace(
    "sellingPrice: 0,",
    "sellingPrice: 0,\n    supplierId: '',"
  );
  
  // restockData
  page = page.replace(
    "newSellingPrice: 0",
    "newSellingPrice: 0,\n    supplierId: '',"
  );

  // setFormData when editing
  page = page.replace(
    "purchasePrice: item.purchasePrice,",
    "purchasePrice: item.purchasePrice,\n      supplierId: item.supplierId || '',"
  );

  // handleSave for NEW item
  const oldHandleSave = `} else {
        const id = await inventoryService.add(formData);
        const newItem = { id, ...formData, createdAt: new Date() } as InventoryItem;
        setItems([newItem, ...items]);
      }`;
  const newHandleSave = `} else {
        const id = await inventoryService.add(formData);
        const newItem = { id, ...formData, createdAt: new Date() } as InventoryItem;
        setItems([newItem, ...items]);
        
        // Add bill to supplier
        if (formData.supplierId && formData.stock > 0 && formData.purchasePrice > 0) {
          try {
            await supplierService.addBill(formData.supplierId, formData.stock * formData.purchasePrice);
            toast.success("Bill added to supplier automatically.");
          } catch(e) { console.error(e); }
        }
      }`;
  page = page.replace(oldHandleSave, newHandleSave);

  // handleSaveRestock
  const oldRestock = `const updates = {
        stock: newQty,
        purchasePrice: Number(avgPurchasePrice.toFixed(2)),
        sellingPrice: restockData.newSellingPrice
      };`;
  const newRestock = `const updates = {
        stock: newQty,
        purchasePrice: Number(avgPurchasePrice.toFixed(2)),
        sellingPrice: restockData.newSellingPrice,
        ...(restockData.supplierId && { supplierId: restockData.supplierId })
      };
      
      // Add bill to supplier
      if (restockData.supplierId && restockData.addQuantity > 0 && restockData.newPurchasePrice > 0) {
        try {
          await supplierService.addBill(restockData.supplierId, restockData.addQuantity * restockData.newPurchasePrice);
          toast.success("Bill added to supplier automatically.");
        } catch(e) { console.error(e); }
      }`;
  page = page.replace(oldRestock, newRestock);

  // Add Supplier dropdown to Add/Edit form
  const addFormBlock = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Field */}`;
  const addFormBlockNew = `<div className="space-y-1.5 mb-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier (Optional)</label>
                    <CustomSelect
                      value={formData.supplierId}
                      onChange={(val) => setFormData({ ...formData, supplierId: val })}
                      options={[
                        { label: 'None', value: '' },
                        ...suppliers.map(s => ({ label: s.name + (s.company ? \` (\${s.company})\` : ''), value: s.id }))
                      ]}
                      placeholder="Select a supplier..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Field */}`;
  page = page.replace(addFormBlock, addFormBlockNew);

  // Add Supplier dropdown to Restock form
  const restockFormBlock = `<div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity`;
  const restockFormBlockNew = `<div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier (Optional)</label>
                    <CustomSelect
                      value={restockData.supplierId}
                      onChange={(val) => setRestockData({ ...restockData, supplierId: val })}
                      options={[
                        { label: 'None', value: '' },
                        ...suppliers.map(s => ({ label: s.name + (s.company ? \` (\${s.company})\` : ''), value: s.id }))
                      ]}
                      placeholder="Select a supplier..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity`;
  page = page.replace(restockFormBlock, restockFormBlockNew);

  fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
  console.log('Updated inventory/page.tsx');
}
