const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

const targetButton = `{/* ADD CUSTOMER BUTTON */}
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 mr-1 sm:mr-0"
        >
          <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Add Customer</span>
        </button>`;

const newButton = `{pathname === '/' && (
          <div className="flex items-center">
            {/* ADD CUSTOMER BUTTON */}
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 mr-1 sm:mr-0"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Add Customer</span>
            </button>
          </div>
        )}`;

if (content.includes(targetButton)) {
  content = content.replace(targetButton, newButton);
  fs.writeFileSync('src/components/layout/Topbar.tsx', content);
  console.log('Topbar button updated successfully');
} else {
  console.log('Target button not found exactly as specified');
}
