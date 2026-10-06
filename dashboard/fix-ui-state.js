const fs = require('fs');

let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

const oldPerform = `const performStatusUpdate = async (id: string, newStatus: CustomerStatus, c: Customer) => {
    try {
      await customerService.update(id, { status: newStatus });
      setCustomers(customers.map(c => c.id === id ? { ...c, status: newStatus } : c));`;

const newPerform = `const performStatusUpdate = async (id: string, newStatus: CustomerStatus, updatedCustomerData?: Customer) => {
    try {
      await customerService.update(id, { status: newStatus });
      
      setCustomers(customers.map(c => {
        if (c.id === id) {
          if (updatedCustomerData) {
            return { ...updatedCustomerData, status: newStatus };
          }
          return { ...c, status: newStatus };
        }
        return c;
      }));`;

content = content.replace(oldPerform, newPerform);

// Also need to fix the sms part of performStatusUpdate
const oldSms = `const c = customers.find(x => x.id === id);
        if (c && c.phone) {`;
const newSms = `const c = updatedCustomerData || customers.find(x => x.id === id);
        if (c && c.phone) {`;

content = content.replace(oldSms, newSms);

fs.writeFileSync('src/app/customers/page.tsx', content, 'utf8');
console.log('Fixed UI state update for customer status change');
