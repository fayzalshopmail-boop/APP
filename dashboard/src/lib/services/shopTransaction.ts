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
import { Customer, PartUsed, RepairRecord } from './customer';
import { InventoryItem } from './inventory';
import { notificationService } from './notification';

/**
 * Service for compound, atomic financial and inventory operations.
 */
export const shopTransactionService = {
  /**
   * Atomically creates a customer or adds a new repair job to an existing customer's history.
   */
  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'points'>, userEmail: string, userName?: string): Promise<string> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const effectiveStaffName = customerData.receivedByName || userName || userEmail;
    const effectiveStaffEmail = customerData.receivedBy || userEmail;

    // 1. Check if customer already exists by phone number
    const cleanDigits = customerData.phone ? customerData.phone.replace(/\D/g, '') : '';
    let existingDoc: { id: string; data: Customer } | null = null;

    if (cleanDigits.length >= 10) {
      const last10 = cleanDigits.slice(-10);
      const possiblePhones = [
        customerData.phone,
        `+880${last10}`,
        `0${last10}`,
        `880${last10}`,
        last10
      ];
      try {
        const q = query(collection(db, 'customers'), where('phone', 'in', Array.from(new Set(possiblePhones))));
        const snap = await getDocs(q);
        if (!snap.empty) {
          existingDoc = {
            id: snap.docs[0].id,
            data: snap.docs[0].data() as Customer
          };
        }
      } catch (err) {
        console.warn("Failed querying customer by phone in createCustomer:", err);
      }
    }

    if (existingDoc) {
      // Returning customer: Archive old repair to history and set new repair as active
      const existingId = existingDoc.id;
      const prevData = existingDoc.data;
      const prevHistory: RepairRecord[] = prevData.repairHistory || [];

      // If existing customer has an active or past device recorded, archive it
      if (prevData.deviceBrand || prevData.deviceType || prevData.totalBill) {
        prevHistory.push({
          id: `${existingId}_${prevHistory.length}_${Date.now()}`,
          deviceBrand: prevData.deviceBrand,
          deviceType: prevData.deviceType,
          deviceProblem: prevData.deviceProblem,
          deviceDetails: prevData.deviceDetails,
          serialNumber: prevData.serialNumber,
          totalBill: prevData.totalBill || 0,
          advance: prevData.advance || 0,
          due: prevData.due || 0,
          discount: prevData.discount || 0,
          dueDate: prevData.dueDate,
          expectedDeliveryDate: prevData.expectedDeliveryDate,
          status: prevData.status || 'Received',
          warrantyMonths: prevData.warrantyMonths,
          partsUsed: prevData.partsUsed || [],
          totalCost: prevData.totalCost || 0,
          servicedBy: prevData.servicedBy,
          servicedByName: prevData.servicedByName,
          receivedBy: prevData.receivedBy,
          receivedByName: prevData.receivedByName || prevData.receivedBy,
          createdAt: prevData.createdAt || new Date().toISOString()
        });
      }

      const batch = writeBatch(db);
      const targetRef = doc(db, 'customers', existingId);
      batch.update(targetRef, {
        ...customerData,
        receivedBy: effectiveStaffEmail,
        receivedByName: effectiveStaffName,
        name: customerData.name || prevData.name,
        address: customerData.address || prevData.address,
        points: prevData.points || 0,
        status: 'Received',
        partsUsed: [],
        totalCost: 0,
        repairHistory: prevHistory,
        createdAt: serverTimestamp()
      });

      if (customerData.advance && customerData.advance > 0) {
        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, {
          customerId: existingId,
          customerName: customerData.name || prevData.name,
          amount: customerData.advance,
          type: 'Advance Payment',
          receivedBy: effectiveStaffName || userEmail,
          createdAt: serverTimestamp()
        });
      }
      await batch.commit();

      try {
        await notificationService.add({
          title: 'Repeat Customer Added',
          message: `${customerData.name} (Returning Customer) brought a new device, added by ${effectiveStaffName}.`,
          type: 'info',
          targetRole: 'Owner',
          link: `/customers?customerId=${existingId}&search=${encodeURIComponent(customerData.name)}`
        });
      } catch (e) {
        console.error("Failed to add notification", e);
      }

      return existingId;
    }

    // Brand new customer
    const customerRef = doc(collection(db, 'customers'));
    const newId = customerRef.id;

    const batch = writeBatch(db);
    batch.set(customerRef, {
      ...customerData,
      receivedBy: effectiveStaffEmail,
      receivedByName: effectiveStaffName,
      status: 'Received',
      points: 0,
      repairHistory: [],
      createdAt: serverTimestamp()
    });

    if (customerData.advance && customerData.advance > 0) {
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        customerId: newId,
        customerName: customerData.name,
        amount: customerData.advance,
        type: 'Advance Payment',
        receivedBy: effectiveStaffName || userEmail,
        createdAt: serverTimestamp()
      });
    }
    await batch.commit();

    try {
      await notificationService.add({
        title: 'New Customer Added',
        message: `${customerData.name} was added by ${effectiveStaffName}.`,
        type: 'info',
        targetRole: 'Owner',
        link: `/customers?customerId=${newId}&search=${encodeURIComponent(customerData.name)}`
      });
    } catch (e) {
      console.error("Failed to add notification", e);
    }

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

    const customerRef = doc(db as any, 'customers', customerId);
    const lowStockAlerts: any[] = [];
    
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

        const minLevel = itemData.minStockLevel || 5;
        if (newStock <= minLevel && req.delta > 0) { // Only alert if stock was deducted
          lowStockAlerts.push({ name: itemData.name, stock: newStock, min: minLevel });
        }
      }

      // 2. Perform Writes
      for (const update of stockUpdates) {
        transaction.update(update.ref, { stock: update.newStock, updatedAt: serverTimestamp() });
      }

      const totalCost = parts.reduce((acc, p) => acc + (p.cost * p.quantity), 0);
      const newAdvance = (customerData.advance || 0) + paymentReceived;
      const finalTotalBill = (typeof newTotalBill === 'number' && newTotalBill > -1) ? newTotalBill : (customerData.totalBill || 0);
      const newDue = Math.max(0, finalTotalBill - newAdvance - discount);

      const customerUpdates: Partial<Customer> = {
        partsUsed: parts,
        totalCost,
        totalBill: finalTotalBill,
        advance: newAdvance,
        due: newDue,
        discount: discount,
        isBillPending: finalTotalBill <= 0,
        updatedAt: serverTimestamp()
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

    // Dispatch notifications outside transaction
    for (const alert of lowStockAlerts) {
      try {
        await notificationService.add({
          title: 'Low Stock Alert',
          message: `${alert.name} stock has dropped to ${alert.stock} (Min: ${alert.min}). Please restock!`,
          type: 'warning',
          targetRole: 'Owner',
          link: `/inventory?search=${encodeURIComponent(alert.name)}`
        });
      } catch (e) {
        console.error("Failed to add low stock notification", e);
      }
    }
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

    const inventoryRef = doc(db as any, 'inventory', inventoryId);
    let newStockResult = 0;
    let lowStockAlert: any = null;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(inventoryRef);
      if (!snap.exists()) throw new Error('Inventory item not found');
      
      const itemData = snap.data() as InventoryItem;
      const newStock = itemData.stock - quantity;
      
      if (newStock < 0) {
        throw new Error(`Not enough stock. Available: ${itemData.stock}, Requested: ${quantity}`);
      }

      // Check for low stock
      const minLevel = itemData.minStockLevel || 5;
      if (newStock <= minLevel && quantity > 0) {
        lowStockAlert = { name: itemData.name, stock: newStock, min: minLevel };
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

    if (lowStockAlert) {
      try {
        await notificationService.add({
          title: 'Low Stock Alert',
          message: `${lowStockAlert.name} stock has dropped to ${lowStockAlert.stock} (Min: ${lowStockAlert.min}). Please restock!`,
          type: 'warning',
          targetRole: 'Owner',
          link: `/inventory?search=${encodeURIComponent(lowStockAlert.name)}`
        });
      } catch (e) {
        console.error("Failed to add low stock notification", e);
      }
    }

    return { newStock: newStockResult };
  },

  /**
   * Processes an inventory restock atomically.
   * Updates inventory item stock and weighted average purchase price,
   * and synchronously records either supplier debt or a cash purchase transaction.
   */
  async restockItem(params: {
    inventoryId: string;
    addQuantity: number;
    newPurchasePrice: number;
    newSellingPrice: number;
    supplierId?: string;
    userEmail: string;
  }): Promise<{ newStock: number; avgPurchasePrice: number }> {
    if (!db) throw new Error('Firebase DB is not initialized');

    const { inventoryId, addQuantity, newPurchasePrice, newSellingPrice, supplierId, userEmail } = params;
    if (addQuantity <= 0) throw new Error('Quantity must be greater than zero');

    const inventoryRef = doc(db, 'inventory', inventoryId);
    const supplierRef = supplierId ? doc(db, 'suppliers', supplierId) : null;
    let result = { newStock: 0, avgPurchasePrice: 0 };

    await runTransaction(db, async (transaction) => {
      // 1. Read inventory item
      const itemSnap = await transaction.get(inventoryRef);
      if (!itemSnap.exists()) throw new Error('Inventory item not found');

      const itemData = itemSnap.data() as InventoryItem;
      const oldQty = itemData.stock || 0;
      const oldPrice = itemData.purchasePrice || 0;

      const newQty = oldQty + addQuantity;
      const totalOldValue = oldQty * oldPrice;
      const totalNewValue = addQuantity * newPurchasePrice;
      const avgPrice = newQty > 0 ? Number(((totalOldValue + totalNewValue) / newQty).toFixed(2)) : oldPrice;

      // 2. If supplier purchase, read and validate supplier
      let supplierSnap: any = null;
      if (supplierRef) {
        supplierSnap = await transaction.get(supplierRef);
        if (!supplierSnap.exists()) throw new Error('Selected supplier not found');
      }

      // 3. Atomically perform writes
      transaction.update(inventoryRef, {
        stock: newQty,
        purchasePrice: avgPrice,
        sellingPrice: newSellingPrice,
        ...(supplierId ? { supplierId } : {}),
        updatedAt: serverTimestamp()
      });

      if (totalNewValue > 0) {
        if (supplierRef && supplierSnap) {
          const supplierData = supplierSnap.data();
          const newPurchase = (supplierData.totalPurchase || 0) + totalNewValue;
          const newDue = (supplierData.due || 0) + totalNewValue;
          transaction.update(supplierRef, {
            totalPurchase: newPurchase,
            due: newDue,
            updatedAt: serverTimestamp()
          });
        } else {
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            customerId: 'cash-purchase',
            customerName: `${itemData.name} (Restock)`,
            amount: totalNewValue,
            type: 'Inventory Purchase',
            receivedBy: userEmail || 'Unknown',
            createdAt: serverTimestamp()
          });
        }
      }

      result = { newStock: newQty, avgPurchasePrice: avgPrice };
    });

    return result;
  },

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
   * Preserves historical financial transactions for bookkeeping audit trails.
   */
  async deleteCustomerSafely(customerId: string): Promise<void> {
    if (!db) throw new Error('Firebase DB is not initialized');

    // 1. Fetch customer to see if we need to restock
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) return;
    
    const customerData = customerSnap.data() as Customer;
    const parts = customerData.partsUsed || [];

    // 2. WriteBatch to restock parts and delete customer record
    // We intentionally PRESERVE transactions in the 'transactions' ledger so past income and reports remain accurate.
    const batch = writeBatch(db);
    
    // We only restock if the job wasn't Delivered or Returned
    if (customerData.status !== 'Delivered' && customerData.status !== 'Returned (Unrepaired)') {
      for (const part of parts) {
        const invRef = doc(db, 'inventory', part.inventoryId);
        batch.update(invRef, { stock: increment(part.quantity), updatedAt: serverTimestamp() });
      }
    }

    // Delete customer document
    batch.delete(customerRef);

    await batch.commit();
  }

};

