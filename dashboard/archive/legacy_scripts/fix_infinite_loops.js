const fs = require('fs');

const files = [
  'src/app/loans/page.tsx',
  'src/app/inventory/page.tsx',
  'src/app/customers/page.tsx',
  'src/components/layout/Topbar.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // For loans
  content = content.replace(/const closeLoanModal = \(\) => \{\s*closeLoanModal\(\);/g, 'const closeLoanModal = () => {\n    setIsModalOpen(false);');
  content = content.replace(/const closePaymentModal = \(\) => \{\s*closePaymentModal\(\);/g, 'const closePaymentModal = () => {\n    setPaymentModalData(null);');
  content = content.replace(/const closeHistoryModal = \(\) => \{\s*closeHistoryModal\(\);/g, 'const closeHistoryModal = () => {\n    setHistoryModalData(null);');

  // For inventory
  content = content.replace(/const closeInvModal = \(\) => \{\s*closeInvModal\(\);/g, 'const closeInvModal = () => {\n    setIsModalOpen(false);');
  content = content.replace(/const closeRestockModal = \(\) => \{\s*closeRestockModal\(\);/g, 'const closeRestockModal = () => {\n    setIsRestockModalOpen(false);');
  content = content.replace(/const closeSellModal = \(\) => \{\s*closeSellModal\(\);/g, 'const closeSellModal = () => {\n    setIsSellModalOpen(false);');

  // For customers
  content = content.replace(/const closeCustomerModal = \(\) => \{\s*closeCustomerModal\(\);/g, 'const closeCustomerModal = () => {\n    setIsModalOpen(false);');

  // For Topbar
  content = content.replace(/const handleCloseCustomerModal = \(\) => \{\s*handleCloseCustomerModal\(\);/g, 'const handleCloseCustomerModal = () => {\n    setIsCustomerModalOpen(false);');

  fs.writeFileSync(file, content);
}

console.log('Fixed infinite loops in modals');
