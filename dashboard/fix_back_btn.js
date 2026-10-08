const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

// 1. Add the state and useEffect
const stateStr = `const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);`;
const injectedCode = `const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (isCustomerModalOpen) {
        setIsCustomerModalOpen(false);
      }
    };
    if (isCustomerModalOpen) {
      window.history.pushState({ modal: 'add-customer' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isCustomerModalOpen]);

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    if (window.history.state && window.history.state.modal === 'add-customer') {
      window.history.back();
    }
  };`;

content = content.replace(stateStr, injectedCode);

// 2. Replace setIsCustomerModalOpen(false) in handleSaveNewCustomer
content = content.replace(/await shopTransactionService\.createCustomer[\s\S]*?setIsCustomerModalOpen\(false\);/g, (match) => {
  return match.replace('setIsCustomerModalOpen(false)', 'handleCloseCustomerModal()');
});

// 3. Replace onClose in CustomerModal
content = content.replace(/onClose=\{.*?setIsCustomerModalOpen\(false\).*?\}/g, 'onClose={handleCloseCustomerModal}');

fs.writeFileSync('src/components/layout/Topbar.tsx', content);
console.log('Done fixing modal back button');
