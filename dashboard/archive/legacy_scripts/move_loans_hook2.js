const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const hookStart = 'useEffect(() => {\n    const handlePopState = () => {';
const hookEnd = 'if (window.history.state?.modal === \'loans-modal\') window.history.back();\n  };';

const startIdx = content.indexOf(hookStart);
const endIdx = content.indexOf(hookEnd) + hookEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
  const hookStr = content.substring(startIdx, endIdx);
  content = content.substring(0, startIdx) + content.substring(endIdx);
  
  const targetStr = `const [nextDate, setNextDate] = useState<string>('');`;
  content = content.replace(targetStr, targetStr + '\n\n  ' + hookStr + '\n');
  
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Moved hook');
} else {
  console.log('Not found');
}
