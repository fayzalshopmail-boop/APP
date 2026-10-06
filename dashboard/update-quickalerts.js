const fs = require('fs');

let content = fs.readFileSync('src/components/ui/QuickAlerts.tsx', 'utf8');

const oldDues = /\/\/ 2\. Pending Dues Count[\s\S]*?const dueCount = snapshotDues\.data\(\)\.count;/g;

const newDues = `// 2. Pending Dues Count
        const qDues = query(
          collection(db, 'customers'),
          where('due', '>', 0)
        );
        const snapshotDues = await getDocs(qDues);
        let dueCount = 0;
        let closeDueDateCount = 0;
        const now = new Date().getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

        snapshotDues.forEach(doc => {
          dueCount++;
          const customer = doc.data();
          if (customer.dueDate) {
            const dueDateMs = new Date(customer.dueDate).getTime();
            // Approaching within 3 days or already overdue
            if (dueDateMs - now <= threeDaysInMs) {
              closeDueDateCount++;
            }
          }
        });`;

content = content.replace(oldDues, newDues);

const oldDesc = /desc: dueCount > 0 \? \`\$\{dueCount\} customers have dues\` : 'No pending dues',/g;
const newDesc = "desc: dueCount > 0 ? `${dueCount} customers have dues` + (closeDueDateCount > 0 ? ` (${closeDueDateCount} close/overdue)` : '') : 'No pending dues',";

content = content.replace(oldDesc, newDesc);

fs.writeFileSync('src/components/ui/QuickAlerts.tsx', content, 'utf8');
console.log('Updated QuickAlerts');
