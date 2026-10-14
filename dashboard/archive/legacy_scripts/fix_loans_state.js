const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

content = content.replace(
  /const \[formData, setFormData\] = useState\(\{[\s\S]*?personName: '',\s*phone: '',/,
  "const [formData, setFormData] = useState({\n      personName: '',\n      phone: '+880',"
);

// also in `setFormData` block when adding new loan
content = content.replace(
  /setFormData\(\{[\s\S]*?personName: '',\s*phone: '',/,
  "setFormData({\n          personName: '',\n          phone: '+880',"
);

// also check edit modal, maybe if loan.phone is missing, use +880
content = content.replace(
  /phone: loan\.phone \|\| '',/,
  "phone: loan.phone || '+880',"
);

fs.writeFileSync('src/app/loans/page.tsx', content);
console.log('Loans state fixed');
