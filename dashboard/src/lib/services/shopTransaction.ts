import { 
  collection, 
  doc, 
  runTransaction,
  serverTimestamp,
  increment,
  writeBatch,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer, PartUsed } from './customer';
import { Transaction } from './transaction';
import { InventoryItem } from './inventory';

/**
 * Service for compound, atomic financial and inventory operations.
 */
export const shopTransactionService = {
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
   * Processes a parts checkout and optional payment atomically.
   */
  async checkoutParts(
    customerId: string,
    parts: PartUsed[],
    discount: number,
    paymentReceived: number,
    dueDate: string,
    userEmail: string,
    newTotalBill: number = -1
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
  },

  /**
   * Processes a standalone due payment atomically.
   */
  async receivePayment(
      customerId: string,
      paymentAmount: number,
      userEmail: string,
      nextDueDate?: string
    ): Promise<{ newAdvance: number, newDue: number, newDueDate?: string }> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const customerRef = doc(db, 'customers', customerId);
    let result = { newAdvance: 0, newDue: 0 };

    await runTransaction(db, async (transaction) => {
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists()) throw new Error('Customer does not exist');
      
      const customerData = customerSnap.data() as Customer;

      // Validate payment
      if (paymentAmount <= 0) throw new Error('Payment amount must be greater than zero');
      if (paymentAmount > customerData.due) throw new Error('Payment amount cannot exceed the due amount');

      const newAdvance = (customerData.advance || 0) + paymentAmount;
      const newDue = Math.max(0, customerData.totalBill - newAdvance - (customerData.discount || 0));

      // 2. Writes
            const updateData: any = { advance: newAdvance, due: newDue };
      if (newDue === 0) {
        updateData.dueDate = '';
      } else if (nextDueDate) {
        updateData.dueDate = nextDueDate;
      }
      transaction.update(customerRef, updateData);

      const newTransactionRef = doc(collection(db, 'transactions'));
      transaction.set(newTransactionRef, {
        customerId: customerId,
        customerName: customerData.name,
        amount: paymentAmount,
        type: 'Due Collection',
        receivedBy: userEmail,
        createdAt: serverTimestamp()
      });

      result = { newAdvance, newDue };
    });

    return result;
  },

  /**
   * Processes a direct sell atomically.
   */
  async directSell(
    inventoryId: string,
    quantity: number,
    price: number,
    customerName: string,
    userEmail: string
  ): Promise<{ newStock: number }> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const inventoryRef = doc(db, 'inventory', inventoryId);
    let newStockResult = 0;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(inventoryRef);
      if (!snap.exists()) throw new Error('Inventory item not found');
      
      const itemData = snap.data() as InventoryItem;
      const newStock = itemData.stock - quantity;
      
      if (newStock < 0) {
        throw new Error(`Not enough stock. Available: ${itemData.stock}, Requested: ${quantity}`);
      }

      // 2. Writes
      transaction.update(inventoryRef, { stock: newStock, updatedAt: serverTimestamp() });
      
      const newTransactionRef = doc(collection(db, 'transactions'));
      transaction.set(newTransactionRef, {
        customerId: 'direct-sell-' + Date.now(),
        customerName: customerName || 'Walk-in Customer',
        amount: quantity * price,
        type: 'Direct Sell',
        receivedBy: userEmail,
        createdAt: serverTimestamp()
      });

      newStockResult = newStock;
    });

    return { newStock: newStockResult };
  }
,

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

