const fs = require('fs');
const path = 'src/app/customers/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const handleReceivePayment = async \([\s\S]*?alert\("Error: Failed to save payment\. Please check your internet connection\."\); \}/m;

const replacement = `const handleReceivePayment = async (paymentAmount: number) => {
    if (!paymentModalCustomer) return;
    
    try {
      const { newAdvance, newDue } = await shopTransactionService.receivePayment(
        paymentModalCustomer.id,
        paymentAmount,
        user?.email || 'Unknown'
      );
      
      setCustomers(customers.map(c => 
        c.id === paymentModalCustomer.id ? { ...c, advance: newAdvance, due: newDue } : c
      ));
      setPaymentModalCustomer(null);
    } catch (error: any) { 
      console.error("Firebase error", error); 
      alert(error.message || "Error: Failed to save payment."); 
    }`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced handleReceivePayment successfully');
} else {
  console.log('Pattern handleReceivePayment not found');
}

const regex2 = /const handleConfirmParts = async \([\s\S]*?setPartsModalCustomer\(null\);\r?\n    \} catch \(error\) \{\r?\n      console\.error\("Error confirming parts and delivery checkout", error\);\r?\n      alert\("Error: Failed to process delivery checkout\."\);\r?\n    \}/m;

const replacement2 = `const handleConfirmParts = async (data: PartsConfirmData) => {
    if (!partsModalCustomer) return;
    
    const c = customers.find(x => x.id === partsModalCustomer.id);
    if (!c) return;

    try {
      const { parts, discount, paymentReceived, dueDate } = data;
      
      await shopTransactionService.checkoutParts(
        c.id,
        parts,
        discount,
        paymentReceived,
        dueDate,
        user?.email || 'Unknown'
      );
      
      // Complete status update and UI refresh (using optimistic or updated data)
      const totalCost = parts.reduce((acc, p) => acc + (p.cost * p.quantity), 0);
      const newAdvance = (c.advance || 0) + paymentReceived;
      const newDue = Math.max(0, c.totalBill - newAdvance - discount);

      const updateData: Partial<Customer> = { 
        partsUsed: parts, 
        totalCost,
        advance: newAdvance,
        due: newDue,
        discount,
        ...(dueDate && { dueDate })
      };
      
      await performStatusUpdate(c.id, partsModalCustomer.pendingStatus, { ...c, ...updateData });
      
      setPartsModalCustomer(null);
    } catch (error: any) {
      console.error("Error confirming parts and delivery checkout", error);
      alert(error.message || "Error: Failed to process delivery checkout.");
    }`;

if (regex2.test(content)) {
  content = content.replace(regex2, replacement2);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced handleConfirmParts successfully');
} else {
  console.log('Pattern handleConfirmParts not found');
}
