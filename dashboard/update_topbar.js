const fs = require('fs');
const path = require('path');

let topbar = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

// Insert routeSubtitles after routeTitles
if (!topbar.includes('routeSubtitles')) {
    topbar = topbar.replace(
        /const routeTitles: Record<string, string> = {[\s\S]*?};/,
        `$&

const routeSubtitles: Record<string, string> = {
  '/': 'Welcome back to your dashboard.',
  '/customers': 'Manage your TV repair customers and their records.',
  '/inventory': 'Manage parts, stock levels, and pricing.',
  '/due': 'Manage and collect outstanding balances from customers.',
  '/loans': 'Manage money you\\'ve borrowed or lent to others.',
  '/loyalty': 'Manage customer reward points.',
  '/mechanics': 'Manage B2B technician repairs and billing.',
  '/suppliers': 'Manage your vendors and supply chain.',
  '/expenses': 'Track and manage shop expenses.',
  '/reports': 'View business analytics and insights.',
  '/settings': 'Configure your shop settings.',
  '/sms': 'SMS packages and delivery history.'
};`
    );
}

// Add subtitle variable
if (!topbar.includes('const subtitle = routeSubtitles')) {
    topbar = topbar.replace(
        /const title = routeTitles\[basePath\] \|\| routeTitles\[pathname\] \|\| 'Dashboard';/,
        `$&
  const subtitle = routeSubtitles[basePath] || routeSubtitles[pathname] || '';`
    );
}

// Update the render
topbar = topbar.replace(
    /<h1 className="text-xl md:text-2xl font-bold text-white truncate max-w-\[200px\] md:max-w-none">\{title\}<\/h1>/,
    `<div className="flex flex-col">
          <h1 className="text-lg md:text-2xl font-bold text-white leading-tight truncate max-w-[200px] md:max-w-[400px]">{title}</h1>
          {subtitle && <p className="text-[10px] md:text-sm text-gray-400 leading-tight truncate max-w-[200px] md:max-w-[400px]">{subtitle}</p>}
        </div>`
);

fs.writeFileSync('src/components/layout/Topbar.tsx', topbar);

console.log('Topbar updated');
