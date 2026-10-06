const fs = require('fs');

let content = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

const regexOldSignature = /async receivePayment\(\s*customerId: string,\s*paymentAmount: number,\s*userEmail: string\s*\): Promise<{ newAdvance: number, newDue: number }> \{/g;
const newSignature = `async receivePayment(
      customerId: string,
      paymentAmount: number,
      userEmail: string,
      nextDueDate?: string
    ): Promise<{ newAdvance: number, newDue: number, newDueDate?: string }> {`;

content = content.replace(regexOldSignature, newSignature);

const regexOldUpdate = /transaction\.update\(customerRef, \{\s*advance: newAdvance,\s*due: newDue\s*\}\);/g;
const newUpdate = `      const updateData: any = { advance: newAdvance, due: newDue };
      if (newDue === 0) {
        updateData.dueDate = '';
      } else if (nextDueDate) {
        updateData.dueDate = nextDueDate;
      }
      transaction.update(customerRef, updateData);`;

content = content.replace(regexOldUpdate, newUpdate);

fs.writeFileSync('src/lib/services/shopTransaction.ts', content, 'utf8');
console.log('Updated shopTransactionService');
