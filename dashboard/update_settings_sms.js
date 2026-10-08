const fs = require('fs');

let settings = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
settings = settings.replace(
    /<div className="flex items-center gap-4 mb-8">[\s\S]*?<\/div>\s*<\/div>/,
    ''
);
fs.writeFileSync('src/app/settings/page.tsx', settings);

let sms = fs.readFileSync('src/app/sms/page.tsx', 'utf8');
sms = sms.replace(
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    ''
);
fs.writeFileSync('src/app/sms/page.tsx', sms);

console.log('Fixed settings and sms');
