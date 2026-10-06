const fs = require('fs');

let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

const oldHandle = /const handleReceivePayment = async \(paymentAmount: number\) => \{[\s\S]*?const \{ newAdvance, newDue \} = await shopTransactionService\.receivePayment\([\s\S]*?paymentModalCustomer\.id,\s*paymentAmount,\s*user\?\.email \|\| 'Unknown'\s*\);/g;

const newHandle = `const handleReceivePayment = async (paymentAmount: number, nextDueDate?: string) => {
    if (!paymentModalCustomer) return;
    
    try {
      const { newAdvance, newDue } = await shopTransactionService.receivePayment(
        paymentModalCustomer.id,
        paymentAmount,
        user?.email || 'Unknown',
        nextDueDate
      );`;

content = content.replace(oldHandle, newHandle);

const oldSetCustomers = /setCustomers\(customers\.map\(c => \s*c\.id === paymentModalCustomer\.id \? \{ \.\.\.c, advance: newAdvance, due: newDue \} : c\s*\)\);/g;
const newSetCustomers = `setCustomers(customers.map(c => 
        c.id === paymentModalCustomer.id ? { 
          ...c, 
          advance: newAdvance, 
          due: newDue, 
          ...(newDue === 0 ? { dueDate: '' } : nextDueDate ? { dueDate: nextDueDate } : {}) 
        } : c
      ));`;
content = content.replace(oldSetCustomers, newSetCustomers);

fs.writeFileSync('src/app/customers/page.tsx', content, 'utf8');
console.log('Updated customers/page.tsx');
