const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const regex = /<label className="text-xs font-medium text-gray-400">Phone Number \(Optional\)<\/label>[\s\S]*?<div className="flex">[\s\S]*?<span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-gray-800 text-gray-400 text-sm font-medium">[\s\S]*?\+880[\s\S]*?<\/span>[\s\S]*?<Input[\s\S]*?type="tel"[\s\S]*?maxLength=\{11\}[\s\S]*?value=\{formData\.phone \|\| ''\}[\s\S]*?onChange=\{\(e\) => \{[\s\S]*?\/\/ Allow max 11 digits[\s\S]*?let val = e\.target\.value\.replace\(\/\\D\/g, ''\);[\s\S]*?if \(val\.length > 11\) val = val\.substring\(0, 11\);[\s\S]*?setFormData\(\{\.\.\.formData, phone: val\}\)[\s\S]*?\}\}[\s\S]*?placeholder="1XXXXXXXXX"[\s\S]*?className="rounded-l-none"[\s\S]*?\/>[\s\S]*?<\/div>/;

const replacement = `<label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                  <Input 
                    type="tel"
                    maxLength={11}
                    value={formData.phone ? formData.phone.replace(/^\\+880/, '') : ''}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\\D/g, ''); 
                      if (digits.startsWith('0')) digits = digits.substring(1);
                      if (digits.length > 10) digits = digits.substring(0, 10);
                      setFormData({ ...formData, phone: '+880' + digits });
                    }}
                    className="pl-[76px]" 
                    placeholder="1711000000"
                  />
                </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Loans phone fixed');
} else {
  console.log('Regex not matched in loans');
}
