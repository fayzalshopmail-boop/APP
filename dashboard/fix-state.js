const fs = require('fs');

let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

if (!page.includes('const [suppliers, setSuppliers] = useState<Supplier[]>')) {
  page = page.replace(
    "const [invSettings, setInvSettings] = useState<InventorySettings>({ categories: [], productNames: {} });",
    "const [invSettings, setInvSettings] = useState<InventorySettings>({ categories: [], productNames: {} });\n    const [suppliers, setSuppliers] = useState<Supplier[]>([]);"
  );
  fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
  console.log('Fixed state declaration');
}
