const fs = require('fs');
let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

const stateStr = `const [isModalOpen, setIsModalOpen] = useState(false);`;
const injectedCode = `const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (isModalOpen) setIsModalOpen(false);
    };
    if (isModalOpen) {
      window.history.pushState({ modal: 'customer-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen]);

  const closeCustomerModal = () => {
    setIsModalOpen(false);
    if (window.history.state?.modal === 'customer-modal') {
      window.history.back();
    }
  };`;

content = content.replace(stateStr, injectedCode);
content = content.replace(/setIsModalOpen\(false\)/g, 'closeCustomerModal()');

// Fix the one inside handlePopState and closeCustomerModal itself
content = content.replace(/if \(isModalOpen\) closeCustomerModal\(\);/g, 'if (isModalOpen) setIsModalOpen(false);');
content = content.replace(/closeCustomerModal\(\);\n    if \(window/g, 'setIsModalOpen(false);\n    if (window');

fs.writeFileSync('src/app/customers/page.tsx', content);
console.log('Customers modal fixed');
