const fs = require('fs');
const path = 'src/lib/services/shopTransaction.ts';
let content = fs.readFileSync(path, 'utf8');

const newMethod = `
  /**
   * Creates a customer and conditionally records an initial advance payment atomically.
   */
  async createCustomer(
    customerData: Omit<Customer, 'id' | 'createdAt' | 'points'>,
    userEmail: string
  ): Promise<string> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const customerRef = doc(collection(db, 'customers'));
    const customerId = customerRef.id;

    await runTransaction(db, async (transaction) => {
      // Create the customer
      transaction.set(customerRef, {
        ...customerData,
        points: 0,
        status: 'Received',
        createdAt: serverTimestamp()
      });

      // If they gave an advance, record it atomically
      if (customerData.advance && customerData.advance > 0) {
        const newTransactionRef = doc(collection(db, 'transactions'));
        transaction.set(newTransactionRef, {
          customerId: customerId,
          customerName: customerData.name,
          amount: customerData.advance,
          type: 'Advance',
          receivedBy: userEmail,
          createdAt: serverTimestamp()
        });
      }
    });

    return customerId;
  }
};
`;

content = content.replace("};\r\n", newMethod);
content = content.replace("};\n", newMethod);
fs.writeFileSync(path, content, 'utf8');

const pagePath = 'src/app/customers/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');

const regex = /\/\/ Add\r?\n\s+const newCustomerData = \{ \.\.\.data, status: 'Received' as const \};\r?\n\s+const newId = await customerService\.add\(newCustomerData\);\r?\n\s+\/\/ Record transaction if there is an advance\r?\n\s+if \(data\.advance && data\.advance > 0\) \{\r?\n\s+await transactionService\.add\(\{\r?\n\s+customerId: newId,\r?\n\s+customerName: data\.name,\r?\n\s+amount: data\.advance,\r?\n\s+type: 'Advance',\r?\n\s+receivedBy: user\?\.email \|\| 'Unknown'\r?\n\s+\}\);\r?\n\s+\}/m;

const replacement = `// Add Atomically
        const newId = await shopTransactionService.createCustomer(data, user?.email || 'Unknown');
        const newCustomerData = { ...data, status: 'Received' as const };`;

if (regex.test(pageContent)) {
  pageContent = pageContent.replace(regex, replacement);
  fs.writeFileSync(pagePath, pageContent, 'utf8');
  console.log('Successfully refactored customer creation to use atomic transaction');
} else {
  console.log('Could not find customer creation logic in customers/page.tsx');
}
