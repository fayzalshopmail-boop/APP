const fs = require('fs');

function processPage(filepath, regexDivToRemove, justifyRegex) {
    if(!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    if (regexDivToRemove) {
        content = content.replace(regexDivToRemove, '');
    }
    if (justifyRegex) {
        content = content.replace(justifyRegex, (match) => match.replace('justify-between', 'justify-end'));
    }
    fs.writeFileSync(filepath, content);
}

// due/page.tsx
processPage('src/app/due/page.tsx', 
    /<div>\s*<h1 className="text-2xl font-bold text-white flex items-center gap-2">[\s\S]*?<\/h1>\s*<p className="text-sm text-gray-400 mt-1">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">/
);

// loans/page.tsx
processPage('src/app/loans/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white mb-1">.*?<\/h1>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">/
);

// loyalty/page.tsx
processPage('src/app/loyalty/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white flex items-center gap-2">.*?<\/h1>\s*<p className="text-sm text-gray-400 mt-1">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">/
);

// mechanics/page.tsx
processPage('src/app/mechanics/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white flex items-center gap-2">.*?<\/h1>\s*<p className="text-sm text-gray-400 mt-1">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">/
);

// suppliers/page.tsx
processPage('src/app/suppliers/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white mb-1">.*?<\/h1>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">/
);

// expenses/page.tsx
processPage('src/app/expenses/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white mb-1">.*?<\/h1>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">/
);

// reports/page.tsx
processPage('src/app/reports/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white mb-1">.*?<\/h1>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">/
);

// settings/page.tsx
processPage('src/app/settings/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white mb-1">.*?<\/h1>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">/
);

// sms/page.tsx
processPage('src/app/sms/page.tsx',
    /<div>\s*<h1 className="text-2xl font-bold text-white mb-1">.*?<\/h1>\s*<p className="text-gray-400 text-sm">.*?<\/p>\s*<\/div>/,
    /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">/
);

console.log('Pages updated 2');
