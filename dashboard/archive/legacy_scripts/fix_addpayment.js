const fs = require('fs');
let content = fs.readFileSync('src/lib/services/loan.ts', 'utf8');

const regex = /addPayment:\s*async\s*\(id:\s*string,\s*currentPaid:\s*number,\s*payment:\s*number,\s*totalAmount:\s*number,\s*nextDate\?:\s*string\):\s*Promise<\{\s*newPaid:\s*number,\s*status:\s*'Pending'\s*\|\s*'Paid'\s*\}>\s*=>\s*\{[\s\S]*?return\s*\{\s*newPaid,\s*status:\s*newStatus\s*\};\s*\}/;

const newAddPayment = `addPayment: async (id: string, currentPaid: number, payment: number, totalAmount: number, nextDate?: string): Promise<{ newPaid: number, status: 'Pending' | 'Paid' }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const newPaid = (currentPaid || 0) + payment;
    const newStatus = newPaid >= totalAmount ? 'Paid' : 'Pending';
    
    const historyEntry: LoanHistoryEntry = {
      amount: payment,
      date: new Date().toISOString(),
      type: 'Payment',
      note: 'Partial payment received'
    };

    const updateData: any = {
      paidAmount: newPaid,
      status: newStatus,
      history: arrayUnion(historyEntry),
      updatedAt: serverTimestamp()
    };
    
    if (newStatus === 'Paid') {
      updateData.nextPaymentDate = null;
    } else if (nextDate) {
      updateData.nextPaymentDate = nextDate;
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updateData);

    return { newPaid, status: newStatus };
  }`;

content = content.replace(regex, newAddPayment);
fs.writeFileSync('src/lib/services/loan.ts', content);
console.log('Fixed addPayment');
