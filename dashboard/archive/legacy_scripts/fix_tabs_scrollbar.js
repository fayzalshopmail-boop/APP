const fs = require('fs');
let content = fs.readFileSync('src/app/sms/page.tsx', 'utf8');

const regex = /\{\/\* Tabs \*\/\}\s*<div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide space-x-2 border-b border-gray-800 pb-px mb-6">/;
const replacement = `{/* Tabs */}
        <div className="flex overflow-x-auto whitespace-nowrap space-x-2 border-b border-gray-800 pb-px mb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/sms/page.tsx', content);
  console.log('Added tailwind scrollbar hide');
} else {
  console.log('Regex not matched for tailwind fix');
}
