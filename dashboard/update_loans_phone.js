const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

// 1. Update formData initial state
content = content.replace(
  `const [formData, setFormData] = useState({
    personName: '',
    type: 'Given' as 'Given' | 'Taken',`,
  `const [formData, setFormData] = useState({
    personName: '',
    phone: '',
    type: 'Given' as 'Given' | 'Taken',`
);

// 2. Update setFormData in handleOpenModal (editingLoan)
content = content.replace(
  `setFormData({
        personName: loan.personName,
        type: loan.type,`,
  `setFormData({
        personName: loan.personName,
        phone: loan.phone || '',
        type: loan.type,`
);

// 3. Update setFormData in handleOpenModal (new loan)
content = content.replace(
  `setFormData({
        personName: '',
        type: 'Given',`,
  `setFormData({
        personName: '',
        phone: '',
        type: 'Given',`
);

// 4. Inject Phone input in modal
const nameInputHtml = `<div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Person Name <span className="text-red-400">*</span></label>
                <Input 
                  required
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  placeholder="Name..."
                />
              </div>`;

const nameAndPhoneHtml = `<div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Person Name <span className="text-red-400">*</span></label>
                <Input 
                  required
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  placeholder="Name..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Phone Number (Optional)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-gray-800 text-gray-400 text-sm">
                    +880
                  </span>
                  <Input 
                    type="text"
                    maxLength={11}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\\D/g, '')})}
                    placeholder="1XXXXXXXXX"
                    className="rounded-l-none"
                  />
                </div>
              </div>`;

content = content.replace(nameInputHtml, nameAndPhoneHtml);

// 5. Update handleSendSms to use phone number
const oldSmsLogic = `const phone = window.prompt(\`Enter mobile number for \${loan.personName} to send SMS:\`, "");`;
const newSmsLogic = `let phone = loan.phone;
      if (phone && !phone.startsWith('+880') && phone.length === 11) {
        phone = '+880' + phone.substring(1); // convert 017... to +88017...
      } else if (phone && !phone.startsWith('+880') && phone.length === 10) {
        phone = '+880' + phone;
      }
      
      if (!phone || phone.length < 11) {
        const manualPhone = window.prompt(\`Enter mobile number for \${loan.personName} to send SMS:\`, loan.phone || "");
        if (!manualPhone || manualPhone.length < 11) {
          toast.error("Valid phone number required.");
          return;
        }
        phone = manualPhone;
      }`;

content = content.replace(oldSmsLogic, newSmsLogic);

fs.writeFileSync('src/app/loans/page.tsx', content);
console.log('Done');
