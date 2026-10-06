const fs = require('fs');
let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const oldFetchRegex = /const \[data, settings\] = await Promise\.all\(\[\s*inventoryService\.getAll\(\),\s*inventorySettingsService\.getSettings\(\)\s*\]\);\s*setItems\(data\);\s*setInvSettings\(settings\);/g;

const newFetch = `const [data, settings, sups] = await Promise.all([
          inventoryService.getAll(),
          inventorySettingsService.getSettings(),
          supplierService.getAll()
        ]);
        setItems(data);
        setInvSettings(settings);
        setSuppliers(sups);`;

page = page.replace(oldFetchRegex, newFetch);
fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
console.log('Fixed fetchData robustly');
