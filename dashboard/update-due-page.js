const fs = require('fs');

let content = fs.readFileSync('src/app/due/page.tsx', 'utf8');

const oldHandle = /const handleReceivePayment = async \(amount: number\) => \{[\s\S]*?const result = await shopTransactionService\.receivePayment\(paymentModalCustomer\.id, amount, user\?\.email \|\| 'Unknown'\);/g;

const newHandle = `const handleReceivePayment = async (amount: number, nextDueDate?: string) => {
    if (!paymentModalCustomer) return;
    try {
      const result = await shopTransactionService.receivePayment(paymentModalCustomer.id, amount, user?.email || 'Unknown', nextDueDate);`;

content = content.replace(oldHandle, newHandle);

const oldSetCustomers = /advance: result\.newAdvance,\s*due: result\.newDue/g;
const newSetCustomers = `advance: result.newAdvance,
            due: result.newDue,
            ...(result.newDue === 0 ? { dueDate: '' } : nextDueDate ? { dueDate: nextDueDate } : {})`;

content = content.replace(oldSetCustomers, newSetCustomers);

fs.writeFileSync('src/app/due/page.tsx', content, 'utf8');
console.log('Updated due/page.tsx');
