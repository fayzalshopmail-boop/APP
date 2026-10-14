const fs = require('fs');

let content = fs.readFileSync('src/app/layout.tsx', 'utf8');

content = content.replace('<html lang="en" suppressHydrationWarning>', '<html lang="en" className="dark" suppressHydrationWarning>');
content = content.replace('bg-background text-white min-h-screen flex', 'bg-background min-h-screen flex text-foreground');

fs.writeFileSync('src/app/layout.tsx', content, 'utf8');
console.log('Fixed theme in layout.tsx');
