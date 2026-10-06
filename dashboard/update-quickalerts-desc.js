const fs = require('fs');

let content = fs.readFileSync('src/components/ui/QuickAlerts.tsx', 'utf8');

const oldDesc = "desc: dueCount > 0 ? `${dueCount} customers have dues` + (closeDueDateCount > 0 ? ` (${closeDueDateCount} close/overdue)` : '') : 'No pending dues',";

const newDesc = `desc: dueCount > 0 ? (
                <span>
                  {dueCount} customers have dues 
                  {closeDueDateCount > 0 && (
                    <span className="text-red-400 font-semibold ml-1">
                      ({closeDueDateCount} close/overdue)
                    </span>
                  )}
                </span>
              ) : 'No pending dues',`;

content = content.replace(oldDesc, newDesc);

fs.writeFileSync('src/components/ui/QuickAlerts.tsx', content, 'utf8');
console.log('Updated QuickAlerts desc visibility');
