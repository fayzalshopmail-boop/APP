const fs = require('fs');
let content = fs.readFileSync('src/lib/services/shopTransaction.ts', 'utf8');

const replacement = `async checkoutParts(
    customerId: string,
    parts: PartUsed[],
    discount: number,
    paymentReceived: number,
    dueDate: string,
    userEmail: string
  ): Promise<void> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const customerRef = doc(db, 'customers', customerId);
    
    await runTransaction(db, async (transaction) => {
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists()) throw new Error('Customer does not exist');
      
      const customerData = customerSnap.data() as Customer;
      const oldParts = customerData.partsUsed || [];
      
      // Calculate delta for inventory
      const partDeltas = new Map<string, number>();
      
      // Subtract old quantities (they were already deducted)
      for (const p of oldParts) {
        partDeltas.set(p.inventoryId, (partDeltas.get(p.inventoryId) || 0) - p.quantity);
      }
      // Add new quantities
      for (const p of parts) {
        partDeltas.set(p.inventoryId, (partDeltas.get(p.inventoryId) || 0) + p.quantity);
      }
      
      // Only read inventory docs that actually have a delta
      const inventoryRefsToUpdate: { ref: any, delta: number }[] = [];
      for (const [invId, delta] of Array.from(partDeltas.entries())) {
        if (delta !== 0) {
          inventoryRefsToUpdate.push({ ref: doc(db, 'inventory', invId), delta });
        }
      }
      
      const inventorySnaps = await Promise.all(inventoryRefsToUpdate.map(req => transaction.get(req.ref)));
      
      const stockUpdates: { ref: any, newStock: number }[] = [];
      for (let i = 0; i < inventorySnaps.length; i++) {
        const snap = inventorySnaps[i];
        const req = inventoryRefsToUpdate[i];
        if (!snap.exists()) throw new Error('Inventory item not found');
        
        const itemData = snap.data() as InventoryItem;
        const newStock = itemData.stock - req.delta;
        
        if (newStock < 0) {
          throw new Error('Not enough stock for ' + itemData.name);
        }
        stockUpdates.push({ ref: snap.ref, newStock });
      }

      // 2. Perform Writes
      for (const update of stockUpdates) {
        transaction.update(update.ref, { stock: update.newStock, updatedAt: serverTimestamp() });
      }

      const totalCost = parts.reduce((acc, p) => acc + (p.cost * p.quantity), 0);
      const newAdvance = (customerData.advance || 0) + paymentReceived;
      const newDue = Math.max(0, customerData.totalBill - newAdvance - discount);

      const customerUpdates: Partial<Customer> = {
        partsUsed: parts,
        totalCost,
        advance: newAdvance,
        due: newDue,
        discount: discount,
      };
      
      if (dueDate) {
        customerUpdates.dueDate = dueDate;
      }
      
      transaction.update(customerRef, customerUpdates);

      if (paymentReceived > 0) {
        const newTransactionRef = doc(collection(db, 'transactions'));
        transaction.set(newTransactionRef, {
          customerId: customerId,
          customerName: customerData.name,
          amount: paymentReceived,
          type: 'Due Collection',
          receivedBy: userEmail,
          createdAt: serverTimestamp()
        });
      }
    });
  },`;

const regex = /async checkoutParts\([\s\S]*?createdAt: serverTimestamp\(\)\r?\n        \}\);\r?\n      \}\r?\n    \}\);\r?\n  \},/m;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/lib/services/shopTransaction.ts', content, 'utf8');
  console.log('Fixed checkoutParts delta');
} else {
  console.log('Regex failed');
}
