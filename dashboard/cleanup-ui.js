const fs = require('fs');
let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

// The file now has duplicate Select Supplier fields because of multiple script runs.
// We'll strip them all out and insert them nicely ONE TIME.

// Strip Add Form Supplier Selects
page = page.replace(/<div className="space-y-1\.5 mb-4">\s*<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier \(Optional\)<\/label>[\s\S]*?<\/div>/g, '');
page = page.replace(/<div className="space-y-1\.5 mb-4 col-span-full">\s*<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier \(Optional\)<\/label>[\s\S]*?<\/div>/g, '');

// Re-insert Add Form Supplier Select cleanly before {/* Category Field */}
page = page.replace('{/* Category Field */}', `<div className="space-y-1.5 mb-4 col-span-full">
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
                    {/* Category Field */}`);

// Strip Restock Form Supplier Selects
page = page.replace(/<div className="space-y-1\.5">\s*<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Select Supplier \(Optional\)<\/label>[\s\S]*?<\/div>/g, '');

// Re-insert Restock Form Supplier Select cleanly before "Add Quantity"
page = page.replace('<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity', `<div className="space-y-1.5 mb-4">
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
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity`);

fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
console.log('Cleaned up UI duplicates');
