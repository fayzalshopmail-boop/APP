const fs = require('fs');
let content = fs.readFileSync('src/app/loans/page.tsx', 'utf8');

const regex = /import \{ (.*?) \} from 'lucide-react';/;
if (regex.test(content)) {
  content = content.replace(regex, (match, p1) => {
    if (!p1.includes('Phone')) {
      return `import { ${p1}, Phone } from 'lucide-react';`;
    }
    return match;
  });
  fs.writeFileSync('src/app/loans/page.tsx', content);
  console.log('Added Phone to lucide-react imports');
} else {
  console.log('No lucide-react import found');
}
