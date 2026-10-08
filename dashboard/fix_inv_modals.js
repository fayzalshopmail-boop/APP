const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const hookStr = `
  useEffect(() => {
    const handlePopState = () => {
      if (isModalOpen) setIsModalOpen(false);
      if (isRestockModalOpen) setIsRestockModalOpen(false);
      if (isSellModalOpen) setIsSellModalOpen(false);
    };
    
    if (isModalOpen || isRestockModalOpen || isSellModalOpen) {
      window.history.pushState({ modal: 'inventory-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen, isRestockModalOpen, isSellModalOpen]);

  const closeInvModal = () => {
    setIsModalOpen(false);
    if (window.history.state?.modal === 'inventory-modal') window.history.back();
  };
  const closeRestockModal = () => {
    setIsRestockModalOpen(false);
    if (window.history.state?.modal === 'inventory-modal') window.history.back();
  };
  const closeSellModal = () => {
    setIsSellModalOpen(false);
    if (window.history.state?.modal === 'inventory-modal') window.history.back();
  };
`;

const stateStr = `const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);`;

content = content.replace(stateStr, stateStr + hookStr);

// Replace setIsModalOpen(false) with closeInvModal()
content = content.replace(/setIsModalOpen\(false\)/g, 'closeInvModal()');
content = content.replace(/if \(isModalOpen\) closeInvModal\(\);/g, 'if (isModalOpen) setIsModalOpen(false);');

// Replace setIsRestockModalOpen(false) with closeRestockModal()
content = content.replace(/setIsRestockModalOpen\(false\)/g, 'closeRestockModal()');
content = content.replace(/if \(isRestockModalOpen\) closeRestockModal\(\);/g, 'if (isRestockModalOpen) setIsRestockModalOpen(false);');

// Replace setIsSellModalOpen(false) with closeSellModal()
content = content.replace(/setIsSellModalOpen\(false\)/g, 'closeSellModal()');
content = content.replace(/if \(isSellModalOpen\) closeSellModal\(\);/g, 'if (isSellModalOpen) setIsSellModalOpen(false);');

// Replace onOpenChange
content = content.replace(/onOpenChange=\{setIsModalOpen\}/g, 'onOpenChange={(v) => !v && closeInvModal()}');
content = content.replace(/onOpenChange=\{setIsRestockModalOpen\}/g, 'onOpenChange={(v) => !v && closeRestockModal()}');
content = content.replace(/onOpenChange=\{setIsSellModalOpen\}/g, 'onOpenChange={(v) => !v && closeSellModal()}');

fs.writeFileSync('src/app/inventory/page.tsx', content);
console.log('Inventory modals fixed');
