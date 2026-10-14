const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

const regex = /<div className="p-4 border-b border-gray-800 flex items-center justify-between bg-\[#1a1d2d\]">[\s\S]*?<\/div>\s*<\/div>/;

const replacement = `<div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between bg-[#1a1d2d] gap-2">
                <h3 className="font-semibold text-white flex items-center gap-1.5 text-sm sm:text-base shrink-0">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount} NEW
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAll} className="text-[11px] sm:text-xs whitespace-nowrap text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      Mark Read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} className="text-[11px] sm:text-xs whitespace-nowrap text-red-400 hover:text-red-300 font-medium transition-colors">
                      Clear All
                    </button>
                  )}
                </div>
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/layout/Topbar.tsx', content);
  console.log('Topbar header responsiveness fixed');
} else {
  console.log('Regex failed');
}
