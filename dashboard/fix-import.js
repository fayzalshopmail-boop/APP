const fs = require('fs');
let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

if (!page.includes("import { supplierService, Supplier }")) {
  page = page.replace(
    "import { inventoryService, inventorySettingsService",
    "import { supplierService, Supplier } from '@/lib/services/supplier';\nimport { inventoryService, inventorySettingsService"
  );
  fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
  console.log('Fixed import');
}
