const fs = require('fs');
let code = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

if (!code.includes('createCustomer:')) {
  const newFunc = `
    /**
     * Atomically creates a customer and records their initial advance payment if > 0.
     */
    async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'points'>, userEmail: string): Promise<string> {
      if (!db) throw new Error('Firebase DB is not initialized');

      const customerRef = doc(collection(db, 'customers'));
      const newId = customerRef.id;

      await runTransaction(db, async (transaction) => {
        transaction.set(customerRef, {
          ...customerData,
          status: 'Received',
          points: 0,
          createdAt: serverTimestamp()
        });

        if (customerData.advance && customerData.advance > 0) {
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            customerId: newId,
            customerName: customerData.name,
            amount: customerData.advance,
            type: 'Advance Payment',
            receivedBy: userEmail,
            createdAt: serverTimestamp()
          });
        }
      });

      return newId;
    },

    /**
     * Processes a parts checkout`;
     
  code = code.replace("/**\r\n     * Processes a parts checkout", newFunc).replace("/**\n     * Processes a parts checkout", newFunc);
  fs.writeFileSync('src/lib/services/shopTransaction.ts', code, 'utf8');
  console.log('Added createCustomer');
}
