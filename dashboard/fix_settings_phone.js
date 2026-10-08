const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

const regex = /<div className="relative">\s*<Phone className="absolute left-4 top-1\/2 -translate-y-1\/2 w-4 h-4 text-gray-500" \/>\s*<input\s*type="text"\s*value=\{shopForm\.phone\}\s*onChange=\{\(e\) => setShopForm\(\{ \.\.\.shopForm, phone: e\.target\.value \}\)\}\s*className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500\/50"\s*placeholder="Shop Phone Number"\s*\/>\s*<\/div>/;

const replacement = `<div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 font-medium text-gray-300 pointer-events-none">+880</span>
                  <input 
                    type="tel"
                    maxLength={11}
                    value={shopForm.phone ? shopForm.phone.replace(/^\\+880/, '') : ''}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\\D/g, ''); 
                      if (digits.startsWith('0')) digits = digits.substring(1);
                      if (digits.length > 10) digits = digits.substring(0, 10);
                      setShopForm({ ...shopForm, phone: '+880' + digits });
                    }}
                    className="w-full bg-popover border border-gray-800 text-white rounded-xl pl-[76px] pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" 
                    placeholder="1711000000"
                  />
                </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/settings/page.tsx', content);
  console.log('Settings phone fixed');
} else {
  console.log('Regex not matched in settings');
}
