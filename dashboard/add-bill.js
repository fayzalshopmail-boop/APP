const fs = require('fs');

let service = fs.readFileSync('src/lib/services/supplier.ts', 'utf8');
if (!service.includes('addBill:')) {
  service = service.replace(
    "delete: async (id: string): Promise<void> => {",
    `addBill: async (id: string, amount: number): Promise<{ newPurchase: number, newDue: number }> => {
    if (!db) throw new Error('Firebase DB is not initialized');
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Supplier not found');
    
    const data = snap.data() as Supplier;
    const newPurchase = (data.totalPurchase || 0) + amount;
    const newDue = (data.due || 0) + amount;
    
    await updateDoc(docRef, {
      totalPurchase: newPurchase,
      due: newDue
    });
    return { newPurchase, newDue };
  },

  delete: async (id: string): Promise<void> => {`
  );
  fs.writeFileSync('src/lib/services/supplier.ts', service, 'utf8');
  console.log('Updated service');
}

let page = fs.readFileSync('src/app/suppliers/page.tsx', 'utf8');
if (!page.includes('billModalSupplier')) {
  page = page.replace("const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);", 
    "const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);\n  const [billModalSupplier, setBillModalSupplier] = useState<Supplier | null>(null);\n  const [billAmount, setBillAmount] = useState('');");
    
  page = page.replace("const handlePayment = async (e: React.FormEvent) => {", 
    `const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billModalSupplier) return;
    const amount = Number(billAmount);
    if (amount <= 0) return alert("Invalid amount");

    try {
      const { newPurchase, newDue } = await supplierService.addBill(billModalSupplier.id, amount);
      setSuppliers(suppliers.map(s => 
        s.id === billModalSupplier.id ? { ...s, totalPurchase: newPurchase, due: newDue } : s
      ));
      setBillModalSupplier(null);
      setBillAmount('');
    } catch (err) {
      console.error(err);
      alert("Failed to add bill");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {`);
  
  page = page.replace("Pay Due\n                        </button>\n                      )}", 
    `Pay Due
                        </button>
                      )}
                      <button 
                        onClick={() => setBillModalSupplier(s)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 ml-2 flex items-center gap-1 bg-blue-400/10 hover:bg-blue-400/20 px-2 py-0.5 rounded transition-colors inline-flex"
                      >
                        <Plus className="w-3 h-3" /> Add Bill
                      </button>`);

  const billModal = `      {/* Add Bill Modal */}
      <Dialog open={!!billModalSupplier} onOpenChange={(open) => !open && setBillModalSupplier(null)}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Add New Bill</DialogTitle>
          </DialogHeader>
          {billModalSupplier && (
            <div className="mt-4">
              <form onSubmit={handleAddBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Bill Amount (Purchase)</label>
                  <Input 
                    type="number"
                    required
                    min="1"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="Enter bill amount..."
                    className="h-12 text-lg"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setBillModalSupplier(null)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Add Bill</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ConfirmModal`;

  page = page.replace("<ConfirmModal", billModal);
  
  fs.writeFileSync('src/app/suppliers/page.tsx', page, 'utf8');
  console.log('Updated page');
}
