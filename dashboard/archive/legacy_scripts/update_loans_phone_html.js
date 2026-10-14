const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const nameInputHtml = `<div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Person / Entity Name <span className="text-red-400">*</span></label>
                <Input 
                  required
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  placeholder="Name..."
                />
              </div>`;

const nameAndPhoneHtml = `<div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Person / Entity Name <span className="text-red-400">*</span></label>
                <Input 
                  required
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  placeholder="Name..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Phone Number (Optional)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-gray-800 text-gray-400 text-sm font-medium">
                    +880
                  </span>
                  <Input 
                    type="tel"
                    maxLength={11}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\\D/g, '')})}
                    placeholder="1XXXXXXXXX"
                    className="rounded-l-none"
                  />
                </div>
              </div>`;

if (content.includes(nameInputHtml)) {
  content = content.replace(nameInputHtml, nameAndPhoneHtml);
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Phone input added');
} else {
  console.log('Failed to find name input');
}
