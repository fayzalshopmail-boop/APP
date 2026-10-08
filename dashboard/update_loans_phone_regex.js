const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const regex = /<label className="text-xs font-medium text-gray-400">Person \/ Entity Name <span className="text-red-400">\*<\/span><\/label>\s*<Input\s*required\s*value=\{formData\.personName\}\s*onChange=\{\(e\) => setFormData\(\{.*?\}\)\}\s*placeholder="Name\.\.\."\s*\/>\s*<\/div>/;

const nameAndPhoneHtml = `<label className="text-xs font-medium text-gray-400">Person / Entity Name <span className="text-red-400">*</span></label>
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
                    value={formData.phone || ''}
                    onChange={(e) => {
                      // Allow max 11 digits
                      let val = e.target.value.replace(/\\D/g, '');
                      if (val.length > 11) val = val.substring(0, 11);
                      setFormData({...formData, phone: val})
                    }}
                    placeholder="1XXXXXXXXX"
                    className="rounded-l-none"
                  />
                </div>
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, nameAndPhoneHtml);
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Phone input added with regex');
} else {
  console.log('Failed to find name input even with regex');
}
