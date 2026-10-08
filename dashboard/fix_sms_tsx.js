const fs = require('fs');
let content = fs.readFileSync('src/app/sms/page.tsx', 'utf8');

content = content.replace(
  `Variables: {name}, {shop}, {due}</p>`,
  `Variables: {'{name}'}, {'{shop}'}, {'{due}'}</p>`
);
content = content.replace(
  `Variables: {name}, {shop}, {due}</p>`,
  `Variables: {'{name}'}, {'{shop}'}, {'{due}'}</p>`
);

fs.writeFileSync('src/app/sms/page.tsx', content);
console.log('Fixed TS error');
