const fs = require('fs');
let content = fs.readFileSync('src/app/sms/page.tsx', 'utf8');

const newTemplatesHtml = `                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-white">Loan Reminder Template (Money Given)</h2>
                  <p className="text-xs text-gray-400">Sent to people who owe you money. Variables: {name}, {shop}, {due}</p>
                  <textarea 
                    value={settings.loanGivenTemplate || ''}
                    onChange={(e) => setSettings({ ...settings, loanGivenTemplate: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                  />
                </div>
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-white">Loan Reminder Template (Money Taken)</h2>
                  <p className="text-xs text-gray-400">Sent to people you owe money to. Variables: {name}, {shop}, {due}</p>
                  <textarea 
                    value={settings.loanTakenTemplate || ''}
                    onChange={(e) => setSettings({ ...settings, loanTakenTemplate: e.target.value })}
                    className="w-full bg-popover border border-gray-800 text-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none leading-relaxed"
                  />
                </div>`;

const searchStr = `<h2 className="text-lg font-bold text-white">Points Redeemed Template</h2>`;

// We will locate `</textarea>\n                </div>` after `Points Redeemed Template` and append
const parts = content.split('Points Redeemed Template');
if (parts.length === 2) {
  const afterPoints = parts[1];
  const insertIndex = afterPoints.indexOf('</div>') + '</div>'.length;
  
  const finalContent = parts[0] + 'Points Redeemed Template' + afterPoints.substring(0, insertIndex) + '\n' + newTemplatesHtml + afterPoints.substring(insertIndex);
  fs.writeFileSync('src/app/sms/page.tsx', finalContent);
  console.log('UI updated for sms templates');
} else {
  console.log('Could not find split point');
}
