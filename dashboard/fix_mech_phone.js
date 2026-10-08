const fs = require('fs');
let content = fs.readFileSync('src/app/mechanics/page.tsx', 'utf8');

const regex = /<div className="space-y-1\.5">\s*<label className="text-xs font-medium text-gray-400">Phone <span className="text-red-400">\*<\/span><\/label>\s*<Input required value=\{formData\.phone\} onChange=\{\(e\) => setFormData\(\{\.\.\.formData, phone: e\.target\.value\}\)\} \/>\s*<\/div>/;

const replacement = `<div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                  <Input 
                    required
                    value={formData.phone ? formData.phone.replace(/^\\+880/, '') : ''}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\\D/g, ''); 
                      if (digits.startsWith('0')) digits = digits.substring(1);
                      if (digits.length > 10) digits = digits.substring(0, 10);
                      setFormData({ ...formData, phone: '+880' + digits });
                    }}
                    className="pl-[76px]" 
                    placeholder="1711000000"
                    maxLength={11}
                  />
                </div>
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/mechanics/page.tsx', content);
  console.log('Mechanics phone fixed');
} else {
  console.log('Regex not matched in mechanics');
}
