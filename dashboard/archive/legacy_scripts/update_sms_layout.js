const fs = require('fs');
let content = fs.readFileSync('src/app/sms/page.tsx', 'utf8');

const regex = /<div className="pt-8 border-t border-gray-800 flex justify-between items-center">[\s\S]*?<div className="flex items-center gap-4">[\s\S]*?<button[\s\S]*?onClick=\{handleCheckBalance\}[\s\S]*?disabled=\{checkingBalance \|\| !settings\.apiKey\}[\s\S]*?className="bg-popover hover:bg-gray-800 border border-gray-700 text-gray-300 px-5 py-2\.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"[\s\S]*?>[\s\S]*?\{checkingBalance \? <Loader2 className="w-4 h-4 animate-spin" \/> : <Wallet className="w-4 h-4" \/>\}[\s\S]*?Check Balance[\s\S]*?<\/button>[\s\S]*?\{balance && \([\s\S]*?<div className="text-sm font-semibold text-emerald-400 bg-emerald-500\/10 px-4 py-2 rounded-lg border border-emerald-500\/20">[\s\S]*?Balance: \{formatCurrency\(Number\(balance\)\)\}[\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?<button[\s\S]*?onClick=\{handleSave\}[\s\S]*?disabled=\{saving\}[\s\S]*?className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500\/20 flex items-center gap-2 disabled:opacity-70"[\s\S]*?>[\s\S]*?\{saving \? <Loader2 className="w-4 h-4 animate-spin" \/> : <Save className="w-4 h-4" \/>\}[\s\S]*?Save API Settings[\s\S]*?<\/button>[\s\S]*?<\/div>/;

const newHTML = `<div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={handleCheckBalance}
                    disabled={checkingBalance || !settings.apiKey}
                    className="w-full sm:w-auto justify-center bg-popover hover:bg-gray-800 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {checkingBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Check Balance
                  </button>
                  {balance && (
                    <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-center w-full sm:w-auto">
                      Balance: {formatCurrency(Number(balance))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto justify-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save API Settings
                </button>
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newHTML);
  fs.writeFileSync('src/app/sms/page.tsx', content);
  console.log('API settings buttons updated');
} else {
  console.log('Failed to match regex');
}
