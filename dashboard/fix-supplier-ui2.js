const fs = require('fs');
let page = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const addReplacement = `
                    <div className="space-y-1.5 mb-4 col-span-full">
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
                    {/* Category Field */}`;
                    
page = page.replace('{/* Category Field */}', addReplacement);

const restockReplacement = `
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
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity`;

page = page.replace('<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Add Quantity', restockReplacement);

fs.writeFileSync('src/app/inventory/page.tsx', page, 'utf8');
console.log('Fixed UI components safely');
