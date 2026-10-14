const fs = require('fs');
let content = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

const newMethods = `

  /**
   * Marks a customer as returned (unrepaired).
   * Restocks any parts they had assigned and refunds any advance.
   */
  async markAsReturned(customerId: string, userEmail: string): Promise<void> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const customerRef = doc(db, 'customers', customerId);

    await runTransaction(db, async (transaction) => {
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists()) throw new Error('Customer does not exist');
      
      const customerData = customerSnap.data() as Customer;
      const parts = customerData.partsUsed || [];

      // Read inventory items to restock
      const inventoryRefs = parts.map(p => doc(db, 'inventory', p.inventoryId));
      const inventorySnaps = await Promise.all(inventoryRefs.map(ref => transaction.get(ref)));

      // Prepare stock updates (we only restock if the inventory item still exists)
      const stockUpdates: { ref: any, newStock: number }[] = [];
      for (let i = 0; i < inventorySnaps.length; i++) {
        const snap = inventorySnaps[i];
        if (snap.exists()) {
          const itemData = snap.data() as InventoryItem;
          stockUpdates.push({ ref: snap.ref, newStock: itemData.stock + parts[i].quantity });
        }
      }

      // Restock
      for (const update of stockUpdates) {
        transaction.update(update.ref, { stock: update.newStock, updatedAt: serverTimestamp() });
      }

      // Refund advance if any
      if (customerData.advance && customerData.advance > 0) {
        const newTransactionRef = doc(collection(db, 'transactions'));
        transaction.set(newTransactionRef, {
          customerId: customerId,
          customerName: customerData.name,
          amount: customerData.advance,
          type: 'Refund',
          receivedBy: userEmail,
          createdAt: serverTimestamp()
        });
      }

      // Clear customer financials and parts
      transaction.update(customerRef, {
        status: 'Returned (Unrepaired)',
        partsUsed: [],
        totalCost: 0,
        advance: 0,
        due: 0,
        totalBill: 0,
        discount: 0,
        dueDate: ''
      });
    });
  },

  /**
   * Safely deletes a customer.
   * Restocks any parts if they were not 'Delivered'
   * And deletes all related transactions.
   */
  async deleteCustomerSafely(customerId: string): Promise<void> {
    if (!db) throw new Error('Firebase DB is not initialized');

    // 1. Fetch customer to see if we need to restock
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) return;
    
    const customerData = customerSnap.data() as Customer;
    const parts = customerData.partsUsed || [];
    
    // 2. Fetch all transactions for this customer
    const qTransactions = query(collection(db, 'transactions'), where('customerId', '==', customerId));
    const transactionsSnap = await getDocs(qTransactions);

    // 3. WriteBatch to delete everything and restock
    const batch = writeBatch(db);
    
    // We only restock if the job wasn't Delivered or Returned
    if (customerData.status !== 'Delivered' && customerData.status !== 'Returned (Unrepaired)') {
      for (const part of parts) {
        const invRef = doc(db, 'inventory', part.inventoryId);
        batch.update(invRef, { stock: increment(part.quantity), updatedAt: serverTimestamp() });
      }
    }

    // Delete transactions
    transactionsSnap.forEach(tDoc => {
      batch.delete(tDoc.ref);
    });

    // Delete customer
    batch.delete(customerRef);

    await batch.commit();
  }
};
`;

content = content.replace('};\r\n', newMethods);
content = content.replace('};\n', newMethods);

if (!content.includes('writeBatch')) {
  content = content.replace(
    "import { doc, runTransaction, collection, serverTimestamp, increment } from 'firebase/firestore';",
    "import { doc, runTransaction, collection, serverTimestamp, increment, writeBatch, getDoc, getDocs, query, where } from 'firebase/firestore';"
  );
}

fs.writeFileSync('src/lib/services/shopTransaction.ts', content, 'utf8');
console.log('Added Phase 2 backend methods');
