const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const hookStr = `
  useEffect(() => {
    const handlePopState = () => {
      if (isModalOpen) setIsModalOpen(false);
      if (paymentModalData) setPaymentModalData(null);
      if (historyModalData) setHistoryModalData(null);
    };
    
    if (isModalOpen || paymentModalData || historyModalData) {
      window.history.pushState({ modal: 'loans-modal' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen, paymentModalData, historyModalData]);

  const closeLoanModal = () => {
    setIsModalOpen(false);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };
  const closePaymentModal = () => {
    setPaymentModalData(null);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };
  const closeHistoryModal = () => {
    setHistoryModalData(null);
    if (window.history.state?.modal === 'loans-modal') window.history.back();
  };
`;

const stateStr = `const [isModalOpen, setIsModalOpen] = useState(false);`;

if (!content.includes('handlePopState')) {
  content = content.replace(stateStr, stateStr + hookStr);
  
  content = content.replace(/setIsModalOpen\(false\)/g, 'closeLoanModal()');
  content = content.replace(/if \(isModalOpen\) closeLoanModal\(\);/g, 'if (isModalOpen) setIsModalOpen(false);');

  content = content.replace(/setPaymentModalData\(null\)/g, 'closePaymentModal()');
  content = content.replace(/if \(paymentModalData\) closePaymentModal\(\);/g, 'if (paymentModalData) setPaymentModalData(null);');

  content = content.replace(/setHistoryModalData\(null\)/g, 'closeHistoryModal()');
  content = content.replace(/if \(historyModalData\) closeHistoryModal\(\);/g, 'if (historyModalData) setHistoryModalData(null);');

  content = content.replace(/onOpenChange=\{setIsModalOpen\}/g, 'onOpenChange={(v) => !v && closeLoanModal()}');
  
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Loans modals fixed');
}
