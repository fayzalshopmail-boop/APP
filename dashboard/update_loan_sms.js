const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const regex = /const dueAmount = loan\.amount - \(loan\.paidAmount \|\| 0\);\s*const msg = `Dear \$\{loan\.personName\}, your unpaid loan of \$\{dueAmount\} TK at \$\{shopName\} is due\. Please clear it ASAP\. Thank you\.`;/;

const newLogic = `const dueAmount = loan.amount - (loan.paidAmount || 0);
      let template = loan.type === 'Given' ? smsSettings.loanGivenTemplate : smsSettings.loanTakenTemplate;
      
      if (!template) {
        template = 'Dear {name}, your unpaid loan of {due} TK at {shop} is due. Please clear it ASAP. Thank you.';
      }
      
      const msg = template
        .replace(/{name}/g, loan.personName || '')
        .replace(/{due}/g, \`\${dueAmount}\`)
        .replace(/{shop}/g, shopName || '');`;

if (regex.test(content)) {
  content = content.replace(regex, newLogic);
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Loan logic updated');
} else {
  console.log('Failed to match regex');
}
