const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

const regex = /<button[\s\S]*?onClick=\{handleLogoutRequest\}[\s\S]*?className="absolute right-4[^>]*>[\s\S]*?<LogOut className="w-4 h-4" \/>[\s\S]*?<\/button>/;

const newButtons = `<div className="absolute right-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
          {user?.role === 'Owner' && (
            <button 
              onClick={() => setUnlocked(false)}
              className="text-gray-500 hover:text-orange-400 transition-colors bg-[#1b1f30] hover:bg-gray-800 p-1.5 rounded-lg"
              title="Lock Screen"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={handleLogoutRequest}
            className="text-gray-500 hover:text-red-400 transition-colors bg-[#1b1f30] hover:bg-gray-800 p-1.5 rounded-lg"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>`;

content = content.replace(regex, newButtons);
fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
console.log('Sidebar updated properly');
