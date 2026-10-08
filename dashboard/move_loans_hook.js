const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const hookRegex = /\s*useEffect\(\(\) => \{\s*const handlePopState = \(\) => \{\s*if \(isModalOpen\) setIsModalOpen\(false\);\s*if \(paymentModalData\) setPaymentModalData\(null\);\s*if \(historyModalData\) setHistoryModalData\(null\);\s*\};\s*if \(isModalOpen \|\| paymentModalData \|\| historyModalData\) \{\s*window\.history\.pushState\(\{ modal: 'loans-modal' \}, ''\);\s*window\.addEventListener\('popstate', handlePopState\);\s*\}\s*return \(\) => window\.removeEventListener\('popstate', handlePopState\);\s*\}, \[isModalOpen, paymentModalData, historyModalData\]\);\s*const closeLoanModal = \(\) => \{\s*setIsModalOpen\(false\);\s*if \(window\.history\.state\?\.modal === 'loans-modal'\) window\.history\.back\(\);\s*\};\s*const closePaymentModal = \(\) => \{\s*setPaymentModalData\(null\);\s*if \(window\.history\.state\?\.modal === 'loans-modal'\) window\.history\.back\(\);\s*\};\s*const closeHistoryModal = \(\) => \{\s*setHistoryModalData\(null\);\s*if \(window\.history\.state\?\.modal === 'loans-modal'\) window\.history\.back\(\);\s*\};/;

const hookStr = content.match(hookRegex)[0];
content = content.replace(hookRegex, ''); // remove it from current position

const targetRegex = /const \[nextDate, setNextDate\] = useState<string>\(''\);/;
content = content.replace(targetRegex, `const [nextDate, setNextDate] = useState<string>('');\n` + hookStr);

fs.writeFileSync('src/app/loans/page.tsx', content);
console.log('Moved hook in loans');
