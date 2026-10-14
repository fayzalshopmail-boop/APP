const fs = require('fs');
let content = fs.readFileSync('src/components/auth/AuthWrapper.tsx', 'utf8');

const timeCheckLogic = `
  // Time-based access control for Technicians
  const currentHour = new Date().getHours();
  const isOutsideWorkingHours = currentHour < 9 || currentHour >= 23;
  
  if (user.role === 'Technician' && isOutsideWorkingHours) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] text-center bg-background p-6">
        <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">কাজের সময় শেষ! 😴</h2>
        <p className="text-gray-400 max-w-sm text-sm sm:text-base leading-relaxed">
          এখন বিশ্রামের সময়। প্রতিদিন সকাল ৯:০০ টা থেকে রাত ১১:০০ টা পর্যন্ত আপনি সিস্টেমে কাজ করতে পারবেন। আগামীকাল সকালে আবার দেখা হবে!
        </p>
        <button 
          onClick={() => {
            useAppStore.getState().setUser(null);
            window.location.reload();
          }} 
          className="mt-8 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          লগ আউট করুন
        </button>
      </div>
    );
  }

  // Role based access control`;

content = content.replace(/\s*\/\/ Role based access control/, timeCheckLogic);

fs.writeFileSync('src/components/auth/AuthWrapper.tsx', content);
console.log('Time-based access control added');
