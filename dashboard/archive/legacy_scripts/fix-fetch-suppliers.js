const fs = require('fs');
let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const oldFetch = `const [data, settings] = await Promise.all([
          inventoryService.getAll(),
          inventorySettingsService.getSettings()
        ]);
        setItems(data);
        setInvSettings(settings);`;

const newFetch = `const [data, settings, sups] = await Promise.all([
          inventoryService.getAll(),
          inventorySettingsService.getSettings(),
          supplierService.getAll()
        ]);
        setItems(data);
        setInvSettings(settings);
        setSuppliers(sups);`;

page = page.replace(oldFetch, newFetch);
fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
console.log('Fixed fetchData to include suppliers');
