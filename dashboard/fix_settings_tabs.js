const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

const regex = /<div className="flex space-x-2 border-b border-gray-800 pb-px">/;
const replacement = `<div className="flex overflow-x-auto whitespace-nowrap space-x-2 border-b border-gray-800 pb-px [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/app/settings/page.tsx', content);
  console.log('Fixed settings tabs scroll');
} else {
  console.log('Regex not matched in settings');
}
