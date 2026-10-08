const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');

const regexOpen = /const \[isCustomerModalOpen, setIsCustomerModalOpen\] = useState\(false\);/;
const replaceOpen = `const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

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

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false);
    if (window.history.state?.modal === 'add-customer') {
      window.history.back();
    }
  };`;

content = content.replace(regexOpen, replaceOpen);

// Replace setIsCustomerModalOpen(false) with closeCustomerModal()
content = content.replace(/setIsCustomerModalOpen\(false\)/g, 'closeCustomerModal()');
// But the one inside handlePopState and closeCustomerModal will be overwritten! 
// Let's do it cleanly using Node AST or just precise replace.
