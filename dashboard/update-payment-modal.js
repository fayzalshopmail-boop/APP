const fs = require('fs');

let content = fs.readFileSync('src/components/ui/PaymentModal.tsx', 'utf8');

// 1. Update props interface
content = content.replace(
  "onSave: (paymentAmount: number) => Promise<void>;",
  "onSave: (paymentAmount: number, nextDueDate?: string) => Promise<void>;"
);

// 2. Add nextDueDate state
content = content.replace(
  "const [amount, setAmount] = useState<string>('');",
  "const [amount, setAmount] = useState<string>('');\n const [nextDueDate, setNextDueDate] = useState<string>('');"
);

// 3. Update handleSubmit
content = content.replace(
  "await onSave(payAmount);",
  "await onSave(payAmount, payAmount < customer.due ? nextDueDate : undefined);"
);

// 4. Update JSX to conditionally show the date input
const newJSX = `
 {Number(amount) > 0 && (
 <p className="text-xs text-gray-400 text-right mt-2 mb-4">
 Remaining Due will be: <span className="text-emerald-400 font-medium">{formatCurrency(customer.due - Number(amount))}</span>
 </p>
 )}

 {Number(amount) > 0 && Number(amount) < customer.due && (
  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 mb-6">
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Next Due Date (For Remaining Amount)</label>
    <Input 
      type="date"
      required
      value={nextDueDate}
      onChange={(e) => setNextDueDate(e.target.value)}
      className="h-12 border-orange-500/30 focus-visible:ring-orange-500/50"
    />
  </div>
 )}
 </div>

 <div className="flex items-center gap-3 pt-2">
`;
content = content.replace(
  /\{Number\(amount\) > 0 && \([\s\S]*?<\/div>\s*<div className="flex items-center gap-3 pt-2">/,
  newJSX
);

fs.writeFileSync('src/components/ui/PaymentModal.tsx', content, 'utf8');
console.log('Updated PaymentModal');
