const fs = require('fs');

let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

// Replace Add Form Block
const addRegex = /<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\s*\{\/\* Category Field \*\/\}/g;
const addReplacement = `<div className="space-y-1.5 mb-4">
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
                    
page = page.replace(addRegex, addReplacement);

// Replace Restock Form Block
const restockRegex = /<div className="space-y-4">\s*<div className="space-y-1\.5">\s*<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity/g;
const restockReplacement = `<div className="space-y-4">
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

page = page.replace(restockRegex, restockReplacement);

fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
console.log('Fixed UI components');
